package model

import "testing"

func TestStoreAndGetResponseResourceBinding(t *testing.T) {
	const responseID = "resp_test_binding"
	const channelID = 123

	StoreResponseResourceBinding(responseID, channelID)

	gotChannelID, ok := GetResponseResourceBinding(responseID)
	if !ok {
		t.Fatalf("expected binding for %s", responseID)
	}
	if gotChannelID != channelID {
		t.Fatalf("expected channel id %d, got %d", channelID, gotChannelID)
	}
}
