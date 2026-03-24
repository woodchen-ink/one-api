package requester

import (
	"errors"
	"net/http"
	"czloapi/common"
	"czloapi/types"

	"github.com/gorilla/websocket"
)

type WSRequester struct {
	WSClient *websocket.Dialer
}

func NewWSRequester(proxyAddr string, enableCompression ...bool) *WSRequester {
	compress := len(enableCompression) > 0 && enableCompression[0]
	return &WSRequester{
		WSClient: GetWSClient(proxyAddr, compress),
	}
}

func (w *WSRequester) NewRequest(url string, header http.Header) (*websocket.Conn, error) {
	conn, resp, err := w.WSClient.Dial(url, header)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusSwitchingProtocols {
		return nil, errors.New("ws unexpected status code")
	}

	return conn, nil
}

func SendWSJsonRequest[T streamable](conn *websocket.Conn, data any, handlerPrefix HandlerPrefix[T]) (*wsReader[T], *types.OpenAIErrorWithStatusCode) {
	err := conn.WriteJSON(data)
	if err != nil {
		return nil, common.ErrorWrapper(err, "ws_request_failed", http.StatusInternalServerError)
	}

	stream := &wsReader[T]{
		reader:        conn,
		handlerPrefix: handlerPrefix,

		DataChan: make(chan T),
		ErrChan:  make(chan error),
	}

	return stream, nil
}

// 设置请求头
func (w *WSRequester) WithHeader(headers map[string]string) http.Header {
	header := make(http.Header)
	for k, v := range headers {
		header.Set(k, v)
	}
	return header
}
