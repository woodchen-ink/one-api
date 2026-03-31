package requester

import (
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"czloapi/common/logger"
	"czloapi/types"
)

type WSProxy struct {
	userConn       *websocket.Conn
	supplierConn   *websocket.Conn
	timeout        time.Duration
	pingInterval   time.Duration
	writeTimeout   time.Duration
	handler        MessageHandler
	usageHandler   UsageHandler
	done           chan struct{}
	userClosed     chan struct{}
	supplierClosed chan struct{}
	stopPing       chan struct{}
	stopOnce       sync.Once
}

type MessageSource int

const (
	UserMessage MessageSource = iota
	SupplierMessage
)

type MessageHandler func(source MessageSource, messageType int, message []byte) (bool, *types.UsageEvent, []byte, error)
type UsageHandler func(usage *types.UsageEvent) error

func NewWSProxy(userConn, supplierConn *websocket.Conn, timeout time.Duration, handler MessageHandler, usageHandler UsageHandler) *WSProxy {
	return &WSProxy{
		userConn:       userConn,
		supplierConn:   supplierConn,
		timeout:        timeout,
		pingInterval:   wsKeepAliveInterval(timeout),
		writeTimeout:   wsKeepAliveWriteTimeout(timeout),
		handler:        handler,
		usageHandler:   usageHandler,
		done:           make(chan struct{}, 2),
		userClosed:     make(chan struct{}),
		supplierClosed: make(chan struct{}),
		stopPing:       make(chan struct{}),
	}
}

func (p *WSProxy) Start() {
	p.configureKeepalive(p.userConn)
	p.configureKeepalive(p.supplierConn)

	if p.pingInterval > 0 {
		go p.keepalive(p.userConn, UserMessage)
		go p.keepalive(p.supplierConn, SupplierMessage)
	}

	go p.transfer(p.userConn, p.supplierConn, UserMessage, p.userClosed)
	go p.transfer(p.supplierConn, p.userConn, SupplierMessage, p.supplierClosed)
}

func (p *WSProxy) Wait() {
	<-p.done
}

func (p *WSProxy) Close() {
	p.stopOnce.Do(func() {
		close(p.stopPing)
	})
	p.userConn.Close()
	p.supplierConn.Close()
}

func (p *WSProxy) UserClosed() <-chan struct{} {
	return p.userClosed
}

func (p *WSProxy) SupplierClosed() <-chan struct{} {
	return p.supplierClosed
}

func wsKeepAliveInterval(timeout time.Duration) time.Duration {
	if timeout <= 0 {
		return 0
	}

	interval := timeout / 2
	if interval <= 0 {
		return timeout
	}

	return interval
}

func wsKeepAliveWriteTimeout(timeout time.Duration) time.Duration {
	if timeout <= 0 || timeout > 10*time.Second {
		return 10 * time.Second
	}

	return timeout
}

func (p *WSProxy) configureKeepalive(conn *websocket.Conn) {
	if conn == nil || p.timeout <= 0 {
		return
	}

	p.extendReadDeadline(conn)

	defaultPingHandler := conn.PingHandler()
	conn.SetPingHandler(func(appData string) error {
		if err := p.extendReadDeadline(conn); err != nil {
			return err
		}
		if defaultPingHandler != nil {
			return defaultPingHandler(appData)
		}
		return nil
	})

	defaultPongHandler := conn.PongHandler()
	conn.SetPongHandler(func(appData string) error {
		if err := p.extendReadDeadline(conn); err != nil {
			return err
		}
		if defaultPongHandler != nil {
			return defaultPongHandler(appData)
		}
		return nil
	})
}

func (p *WSProxy) extendReadDeadline(conn *websocket.Conn) error {
	if conn == nil || p.timeout <= 0 {
		return nil
	}

	return conn.SetReadDeadline(time.Now().Add(p.timeout))
}

func (p *WSProxy) keepalive(conn *websocket.Conn, source MessageSource) {
	if conn == nil || p.pingInterval <= 0 {
		return
	}

	ticker := time.NewTicker(p.pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-p.stopPing:
			return
		case <-ticker.C:
			select {
			case <-p.stopPing:
				return
			default:
			}

			err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(p.writeTimeout))
			if err != nil {
				select {
				case <-p.stopPing:
					return
				default:
				}
				logger.SysError(fmt.Sprintf("source: %d, WriteControl ping error: %s", source, err.Error()))
				return
			}
		}
	}
}

func (p *WSProxy) transfer(src, dst *websocket.Conn, source MessageSource, closed chan<- struct{}) {
	defer func() {
		close(closed)
		select {
		case p.done <- struct{}{}:
		default:
		}
	}()

	for {
		if err := p.extendReadDeadline(src); err != nil {
			logger.SysError(fmt.Sprintf("source: %d, SetReadDeadline error: %s", source, err.Error()))
			return
		}

		messageType, message, err := src.ReadMessage()
		if err != nil {
			logger.SysError(fmt.Sprintf("source: %d, ReadMessage error: %s", source, err.Error()))
			return
		}

		if p.handler != nil {
			shouldContinue, usage, newMessage, err := p.handler(source, messageType, message)
			if err != nil {
				errMsg := []byte(err.Error())
				dst.WriteMessage(websocket.TextMessage, errMsg)
				logger.SysError(fmt.Sprintf("source: %d, handler error: %s", source, err.Error()))
				return
			}

			if !shouldContinue {
				return
			}

			if newMessage != nil {
				message = newMessage
			}

			if usage != nil && p.usageHandler != nil {
				err := p.usageHandler(usage)
				if err != nil {
					dst.WriteMessage(websocket.TextMessage, message)
					errMsg := []byte(err.Error())
					dst.WriteMessage(websocket.TextMessage, errMsg)
					logger.SysError(fmt.Sprintf("source: %d, usageHandler error: %s", source, err.Error()))
					return
				}
			}
		}

		err = dst.WriteMessage(messageType, message)
		if err != nil {
			logger.SysError(fmt.Sprintf("source: %d, WriteMessage error: %s", source, err.Error()))
			return
		}
	}
}
