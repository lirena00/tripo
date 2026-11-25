import type { MemberBalance } from './balances'
import type { ExpenseWithShares } from './balances'

export interface Insights {
  totalSpendPaise: number
  spendByCategory: { category: string; amountPaise: number }[]
  topCategory: string | null
  payerCounts: { memberId: string; name: string; count: number }[]
  topPayerByCount: { memberId: string; name: string; count: number } | null
  topPayerByAmount: { memberId: string; name: string; amountPaise: number } | null
  biggestCreditor: { memberId: string; name: string; netPaise: number } | null
  biggestDebtor: { memberId: string; name: string; netPaise: number } | null
  shareOfSpendFronted: { memberId: string; name: string; percent: number }[]
}

export function computeInsights(
  members: { id: string; name: string }[],
  expenses: ExpenseWithShares[],
  balances: MemberBalance[]
): Insights {
  const totalSpendPaise = expenses.reduce((acc, e) => acc + e.amountPaise, 0)

  const categoryMap = new Map<string, number>()
  for (const expense of expenses) {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amountPaise)
  }
  const spendByCategory = Array.from(categoryMap.entries())
    .map(([category, amountPaise]) => ({ category, amountPaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise)

  const topCategory = spendByCategory[0]?.category ?? null

  const payerCountMap = new Map<string, number>()
  const payerAmountMap = new Map<string, number>()
  for (const expense of expenses) {
    payerCountMap.set(expense.paidById, (payerCountMap.get(expense.paidById) ?? 0) + 1)
    payerAmountMap.set(expense.paidById, (payerAmountMap.get(expense.paidById) ?? 0) + expense.amountPaise)
  }

  const payerCounts = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    count: payerCountMap.get(m.id) ?? 0,
  })).sort((a, b) => b.count - a.count)

  const topPayerByCount = expenses.length > 0 ? payerCounts[0] : null

  const topPayerByAmount = expenses.length > 0
    ? members
        .map((m) => ({
          memberId: m.id,
          name: m.name,
          amountPaise: payerAmountMap.get(m.id) ?? 0,
        }))
        .sort((a, b) => b.amountPaise - a.amountPaise)[0]
    : null

  const hasExpenses = expenses.length > 0
  const creditors = hasExpenses ? balances.filter((b) => b.netPaise > 0).sort((a, b) => b.netPaise - a.netPaise) : []
  const debtors = hasExpenses ? balances.filter((b) => b.netPaise < 0).sort((a, b) => a.netPaise - b.netPaise) : []

  const biggestCreditor = creditors.length > 0
    ? { memberId: creditors[0].memberId, name: creditors[0].name, netPaise: creditors[0].netPaise }
    : null

  const biggestDebtor = debtors.length > 0
    ? { memberId: debtors[0].memberId, name: debtors[0].name, netPaise: debtors[0].netPaise }
    : null

  const shareOfSpendFronted = members.map((m) => {
    const fronted = payerAmountMap.get(m.id) ?? 0
    const percent = totalSpendPaise > 0 ? Math.round((fronted / totalSpendPaise) * 10000) / 100 : 0
    return { memberId: m.id, name: m.name, percent }
  }).sort((a, b) => b.percent - a.percent)

  return {
    totalSpendPaise,
    spendByCategory,
    topCategory,
    payerCounts,
    topPayerByCount,
    topPayerByAmount,
    biggestCreditor,
    biggestDebtor,
    shareOfSpendFronted,
  }
}