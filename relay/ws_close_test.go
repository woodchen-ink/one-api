package relay

import (
	"testing"
	"time"
)

func TestWaitWSClosureProviderFirst(t *testing.T) {
	userClosed := make(chan struct{})
	supplierClosed := make(chan struct{})
	close(supplierClosed)

	outcome := waitWSClosure(userClosed, supplierClosed, 10*time.Millisecond)

	if outcome.closedBy != "provider" {
		t.Fatalf("expected provider close, got %q", outcome.closedBy)
	}
	if outcome.drainedUpstream {
		t.Fatal("expected drainedUpstream to be false")
	}
	if outcome.timedOut {
		t.Fatal("expected timedOut to be false")
	}
}

func TestWaitWSClosureDrainAfterUserClosed(t *testing.T) {
	userClosed := make(chan struct{})
	supplierClosed := make(chan struct{})

	go func() {
		close(userClosed)
		time.Sleep(5 * time.Millisecond)
		close(supplierClosed)
	}()

	outcome := waitWSClosure(userClosed, supplierClosed, 50*time.Millisecond)

	if outcome.closedBy != "user" {
		t.Fatalf("expected user close, got %q", outcome.closedBy)
	}
	if !outcome.drainedUpstream {
		t.Fatal("expected drainedUpstream to be true")
	}
	if outcome.timedOut {
		t.Fatal("expected timedOut to be false")
	}
}

func TestWaitWSClosureTimeoutAfterUserClosed(t *testing.T) {
	userClosed := make(chan struct{})
	supplierClosed := make(chan struct{})

	close(userClosed)

	outcome := waitWSClosure(userClosed, supplierClosed, 10*time.Millisecond)

	if outcome.closedBy != "user" {
		t.Fatalf("expected user close, got %q", outcome.closedBy)
	}
	if outcome.drainedUpstream {
		t.Fatal("expected drainedUpstream to be false")
	}
	if !outcome.timedOut {
		t.Fatal("expected timedOut to be true")
	}
}
