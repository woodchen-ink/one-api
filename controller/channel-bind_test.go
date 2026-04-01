package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDecodeChannelJSONPayloadNormalizesProxyPoolID(t *testing.T) {
	testCases := []struct {
		name        string
		body        string
		expectedID  *int
		expectedErr string
	}{
		{
			name:       "empty string becomes nil",
			body:       `{"type":1,"key":"test-key","proxy_pool_id":""}`,
			expectedID: nil,
		},
		{
			name:       "whitespace string becomes nil",
			body:       `{"type":1,"key":"test-key","proxy_pool_id":"   "}`,
			expectedID: nil,
		},
		{
			name:       "numeric string becomes int",
			body:       `{"type":1,"key":"test-key","proxy_pool_id":"12"}`,
			expectedID: intPtr(12),
		},
		{
			name:       "number keeps int value",
			body:       `{"type":1,"key":"test-key","proxy_pool_id":7}`,
			expectedID: intPtr(7),
		},
		{
			name:        "invalid string returns error",
			body:        `{"type":1,"key":"test-key","proxy_pool_id":"abc"}`,
			expectedErr: "proxy_pool_id 必须是整数",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			channel, err := decodeChannelJSONPayload([]byte(testCase.body))
			if testCase.expectedErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), testCase.expectedErr)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, testCase.expectedID, channel.ProxyPoolID)
		})
	}
}

func intPtr(value int) *int {
	return &value
}
