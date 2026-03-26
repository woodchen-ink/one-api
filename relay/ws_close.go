package relay

import "time"

const wsUpstreamDrainTimeout = 1500 * time.Millisecond

type wsCloseOutcome struct {
	closedBy        string
	drainedUpstream bool
	timedOut        bool
}

func waitWSClosure(userClosed, supplierClosed <-chan struct{}, drainTimeout time.Duration) wsCloseOutcome {
	select {
	case <-supplierClosed:
		return wsCloseOutcome{closedBy: "provider"}
	case <-userClosed:
		outcome := wsCloseOutcome{closedBy: "user"}
		if drainTimeout <= 0 {
			return outcome
		}

		timer := time.NewTimer(drainTimeout)
		defer timer.Stop()

		select {
		case <-supplierClosed:
			outcome.drainedUpstream = true
		case <-timer.C:
			outcome.timedOut = true
		}

		return outcome
	}
}
