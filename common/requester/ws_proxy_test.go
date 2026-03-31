package requester

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"czloapi/common/logger"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var testWSUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func TestWSProxyKeepsIdleConnectionsAliveWithPing(t *testing.T) {
	logger.Logger = zap.NewNop()

	userURL, closeUserServer := newSilentWSServer(t)
	defer closeUserServer()

	supplierURL, closeSupplierServer := newSilentWSServer(t)
	defer closeSupplierServer()

	userConn := dialTestWS(t, userURL)
	supplierConn := dialTestWS(t, supplierURL)

	proxy := NewWSProxy(userConn, supplierConn, 200*time.Millisecond, nil, nil)
	proxy.Start()
	defer proxy.Close()

	time.Sleep(700 * time.Millisecond)

	select {
	case <-proxy.UserClosed():
		t.Fatal("expected user connection to stay alive while idle")
	default:
	}

	select {
	case <-proxy.SupplierClosed():
		t.Fatal("expected supplier connection to stay alive while idle")
	default:
	}
}

func newSilentWSServer(t *testing.T) (string, func()) {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := testWSUpgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}
		defer conn.Close()

		for {
			if _, _, err = conn.ReadMessage(); err != nil {
				return
			}
		}
	}))

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	return wsURL, server.Close
}

func dialTestWS(t *testing.T, wsURL string) *websocket.Conn {
	t.Helper()

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial %s failed: %v", wsURL, err)
	}

	return conn
}
