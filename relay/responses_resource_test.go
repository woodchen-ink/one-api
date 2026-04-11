package relay

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestPath2RelayUsesResponsesCompactRelay(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/v1/responses/compact", nil)

	relay := Path2Relay(c, c.Request.URL.Path)

	_, ok := relay.(*relayResponsesCompact)
	assert.True(t, ok)
}
