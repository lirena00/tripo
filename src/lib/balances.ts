import type { ComputedShare } from './splits'

export interface MemberBalance {
  memberId: string
  name: string
  netPaise: number
}

export interface ExpenseWithShares {
  id: string
  paidById: string
  amountPaise: number
  shares: ComputedShare[]
}

export interface PaymentRecord {
  fromMemberId: string
  toMemberId: string
  amountPaise: number
}

export function computeBalances(
  members: { id: string; name: string }[],
  expenses: ExpenseWithShares[],
  payments: PaymentRecord[]
): MemberBalance[] {
  const paidByMember = new Map<string, number>()
  const shareOfMember = new Map<string, number>()

  for (const expense of expenses) {
    paidByMember.set(
      expense.paidById,
      (paidByMember.get(expense.paidById) ?? 0) + expense.amountPaise
    )

    for (const share of expense.shares) {
      shareOfMember.set(
        share.memberId,
        (shareOfMember.get(share.memberId) ?? 0) + share.sharePaise
      )
    }
  }

  for (const payment of payments) {
    // Payment from->to means from's debt decreases (net increases), to's credit decreases (net decreases)
    paidByMember.set(
      payment.fromMemberId,
      (paidByMember.get(payment.fromMemberId) ?? 0) + payment.amountPaise
    )
    paidByMember.set(
      payment.toMemberId,
      (paidByMember.get(payment.toMemberId) ?? 0) - payment.amountPaise
    )
  }

  const balances: MemberBalance[] = members.map((member) => {
    const paid = paidByMember.get(member.id) ?? 0
    const share = shareOfMember.get(member.id) ?? 0
    return {
      memberId: member.id,
      name: member.name,
      netPaise: paid - share,
    }
  })

  const sum = balances.reduce((acc, b) => acc + b.netPaise, 0)
  if (sum !== 0) {
    throw new Error(`Balances sum to ${sum}, expected 0`)
  }

  return balances
}