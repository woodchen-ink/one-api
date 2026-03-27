package types

// ReasoningBudgetTokensToEffort maps Claude/OpenAI-style reasoning budgets to
// the closest Responses effort bucket.
func ReasoningBudgetTokensToEffort(budgetTokens int) string {
	switch {
	case budgetTokens <= 0:
		return ""
	case budgetTokens < 4000:
		return "low"
	case budgetTokens < 16000:
		return "medium"
	default:
		return "high"
	}
}
