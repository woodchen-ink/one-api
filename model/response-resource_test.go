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

func TestStoreAndGetConversationResourceBinding(t *testing.T) {
	const conversationID = "conv_test_binding"
	const channelID = 456

	StoreConversationResourceBinding(conversationID, channelID)

	gotChannelID, ok := GetConversationResourceBinding(conversationID)
	if !ok {
		t.Fatalf("expected binding for %s", conversationID)
	}
	if gotChannelID != channelID {
		t.Fatalf("expected channel id %d, got %d", channelID, gotChannelID)
	}
}
