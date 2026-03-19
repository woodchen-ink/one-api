package requester

import (
	"net/http"
	"sync"
	"time"

	"czloapi/common/utils"
)

var HTTPClient *http.Client
var httpClientOnce sync.Once

func InitHttpClient() {
	trans := &http.Transport{
		DialContext: utils.Socks5ProxyFunc,
		Proxy:       utils.ProxyFunc,
	}

	HTTPClient = &http.Client{
		Transport: trans,
	}

	relayTimeout := utils.GetOrDefault("relay_timeout", 0)
	if relayTimeout > 0 {
		HTTPClient.Timeout = time.Duration(relayTimeout) * time.Second
	}
}

func ensureHTTPClient() {
	httpClientOnce.Do(InitHttpClient)
}
