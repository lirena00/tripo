import { describe, it, expect } from 'vitest'
import { computeInsights } from '../src/lib/insights'
import type { MemberBalance, ExpenseWithShares } from '../src/lib/balances'

describe('insights.ts', () => {
  const members = [
    { id: 'm1', name: 'Aman' },
    { id: 'm2', name: 'Bhavna' },
    { id: 'm3', name: 'Chirag' },
    { id: 'm4', name: 'Divya' },
  ]

  const expenses: ExpenseWithShares[] = [
    { id: 'e1', paidById: 'm1', amountPaise: 600000, category: 'stay', shares: [] },
    { id: 'e2', paidById: 'm2', amountPaise: 180000, category: 'fuel', shares: [] },
    { id: 'e3', paidById: 'm3', amountPaise: 120000, category: 'food', shares: [] },
    { id: 'e4', paidById: 'm1', amountPaise: 50000, category: 'food', shares: [] },
  ]

  const balances: MemberBalance[] = [
    { memberId: 'm1', name: 'Aman', netPaise: 360000 },
    { memberId: 'm2', name: 'Bhavna', netPaise: -60000 },
    { memberId: 'm3', name: 'Chirag', netPaise: -120000 },
    { memberId: 'm4', name: 'Divya', netPaise: -180000 },
  ]

  it('computes total spend', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.totalSpendPaise).toBe(950000)
  })

  it('computes spend by category sorted desc', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.spendByCategory).toEqual([
      { category: 'stay', amountPaise: 600000 },
      { category: 'fuel', amountPaise: 180000 },
      { category: 'food', amountPaise: 170000 },
    ])
  })

  it('identifies top category', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.topCategory).toBe('stay')
  })

  it('computes payer counts', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.payerCounts).toEqual([
      { memberId: 'm1', name: 'Aman', count: 2 },
      { memberId: 'm2', name: 'Bhavna', count: 1 },
      { memberId: 'm3', name: 'Chirag', count: 1 },
      { memberId: 'm4', name: 'Divya', count: 0 },
    ])
  })

  it('identifies top payer by count', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.topPayerByCount).toEqual({ memberId: 'm1', name: 'Aman', count: 2 })
  })

  it('identifies top payer by amount', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.topPayerByAmount).toEqual({ memberId: 'm1', name: 'Aman', amountPaise: 650000 })
  })

  it('identifies biggest creditor and debtor', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.biggestCreditor).toEqual({ memberId: 'm1', name: 'Aman', netPaise: 360000 })
    expect(insights.biggestDebtor).toEqual({ memberId: 'm4', name: 'Divya', netPaise: -180000 })
  })

  it('computes share of spend fronted', () => {
    const insights = computeInsights(members, expenses, balances)
    expect(insights.shareOfSpendFronted).toEqual([
      { memberId: 'm1', name: 'Aman', percent: 68.42 },
      { memberId: 'm2', name: 'Bhavna', percent: 18.95 },
      { memberId: 'm3', name: 'Chirag', percent: 12.63 },
      { memberId: 'm4', name: 'Divya', percent: 0 },
    ])
  })

  it('handles empty expenses', () => {
    const insights = computeInsights(members, [], balances)
    expect(insights.totalSpendPaise).toBe(0)
    expect(insights.topCategory).toBeNull()
    expect(insights.topPayerByCount).toBeNull()
    expect(insights.topPayerByAmount).toBeNull()
    expect(insights.biggestCreditor).toBeNull()
    expect(insights.biggestDebtor).toBeNull()
  })
})