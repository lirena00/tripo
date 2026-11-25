import { describe, it, expect } from 'vitest'
import { greedySettle, optimalSettle, naivePairwiseCount, applyPayments, verifySettlement } from '../src/lib/settle'
import type { MemberBalance } from '../src/lib/balances'

describe('settle.ts', () => {
  describe('greedySettle', () => {
    it('gate case: 3 payments all to Aman', () => {
      const balances: MemberBalance[] = [
        { memberId: 'm1', name: 'Aman', netPaise: 360000 },
        { memberId: 'm2', name: 'Bhavna', netPaise: -60000 },
        { memberId: 'm3', name: 'Chirag', netPaise: -120000 },
        { memberId: 'm4', name: 'Divya', netPaise: -180000 },
      ]
      const payments = greedySettle(balances)
      expect(payments.length).toBe(3)
      expect(payments.every(p => p.to === 'm1')).toBe(true)
      expect(verifySettlement(balances, payments)).toBe(true)
    })

    it('greedy vs optimal: +7, +5, +4, -9, -7 (scaled to paise)', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 700 },
        { memberId: 'b', name: 'B', netPaise: 500 },
        { memberId: 'c', name: 'C', netPaise: 400 },
        { memberId: 'd', name: 'D', netPaise: -900 },
        { memberId: 'e', name: 'E', netPaise: -700 },
      ]
      const greedy = greedySettle(balances)
      const optimal = optimalSettle(balances)
      expect(greedy.length).toBe(4)
      expect(optimal.length).toBe(3)
      expect(verifySettlement(balances, greedy)).toBe(true)
      expect(verifySettlement(balances, optimal)).toBe(true)
    })

    it('handles single creditor and single debtor', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: -1000 },
      ]
      const payments = greedySettle(balances)
      expect(payments.length).toBe(1)
      expect(payments[0]).toEqual({ from: 'b', to: 'a', amountPaise: 1000 })
    })

    it('handles already settled (all zeros)', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 0 },
        { memberId: 'b', name: 'B', netPaise: 0 },
      ]
      const payments = greedySettle(balances)
      expect(payments.length).toBe(0)
    })

    it('max n-1 payments', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: -500 },
        { memberId: 'c', name: 'C', netPaise: -500 },
      ]
      const payments = greedySettle(balances)
      expect(payments.length).toBeLessThanOrEqual(2) // n-1 = 2
    })
  })

  describe('optimalSettle', () => {
    it('gate case: 3 payments', () => {
      const balances: MemberBalance[] = [
        { memberId: 'm1', name: 'Aman', netPaise: 360000 },
        { memberId: 'm2', name: 'Bhavna', netPaise: -60000 },
        { memberId: 'm3', name: 'Chirag', netPaise: -120000 },
        { memberId: 'm4', name: 'Divya', netPaise: -180000 },
      ]
      const payments = optimalSettle(balances)
      expect(payments.length).toBe(3)
      expect(verifySettlement(balances, payments)).toBe(true)
    })

    it('greedy vs optimal: optimal gives 3 payments', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 700 },
        { memberId: 'b', name: 'B', netPaise: 500 },
        { memberId: 'c', name: 'C', netPaise: 400 },
        { memberId: 'd', name: 'D', netPaise: -900 },
        { memberId: 'e', name: 'E', netPaise: -700 },
      ]
      const payments = optimalSettle(balances)
      expect(payments.length).toBe(3)
      expect(verifySettlement(balances, payments)).toBe(true)
    })

    it('falls back to greedy for n > 15', () => {
      const balances: MemberBalance[] = Array.from({ length: 16 }, (_, i) => ({
        memberId: `m${i}`,
        name: `M${i}`,
        netPaise: i % 2 === 0 ? 1000 : -1000,
      }))
      // Adjust last to make sum zero
      balances[15].netPaise = -1000
      const payments = optimalSettle(balances)
      expect(payments.length).toBeGreaterThan(0)
      expect(verifySettlement(balances, payments)).toBe(true)
    })

    it('handles all zeros', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 0 },
        { memberId: 'b', name: 'B', netPaise: 0 },
      ]
      const payments = optimalSettle(balances)
      expect(payments.length).toBe(0)
    })

    it('handles single non-zero (should not happen but safe)', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: 0 },
      ]
      const payments = optimalSettle(balances)
      expect(payments.length).toBe(0)
    })
  })

  describe('naivePairwiseCount', () => {
    it('gate case: returns 5', () => {
      const expenses = [
        { paidById: 'm1', shares: [{ memberId: 'm1', sharePaise: 150000 }, { memberId: 'm2', sharePaise: 150000 }, { memberId: 'm3', sharePaise: 150000 }, { memberId: 'm4', sharePaise: 150000 }] },
        { paidById: 'm2', shares: [{ memberId: 'm1', sharePaise: 60000 }, { memberId: 'm2', sharePaise: 60000 }, { memberId: 'm3', sharePaise: 60000 }] },
        { paidById: 'm3', shares: [{ memberId: 'm1', sharePaise: 30000 }, { memberId: 'm2', sharePaise: 30000 }, { memberId: 'm3', sharePaise: 30000 }, { memberId: 'm4', sharePaise: 30000 }] },
      ]
      const count = naivePairwiseCount(expenses)
      expect(count).toBe(5)
    })
  })

  describe('applyPayments', () => {
    it('applying settlements zeroes every balance', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: -500 },
        { memberId: 'c', name: 'C', netPaise: -500 },
      ]
      const payments = [
        { from: 'b', to: 'a', amountPaise: 500 },
        { from: 'c', to: 'a', amountPaise: 500 },
      ]
      const final = applyPayments(balances, payments)
      expect(final.every(b => b.netPaise === 0)).toBe(true)
    })
  })

  describe('verifySettlement', () => {
    it('returns true for valid settlement', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: -1000 },
      ]
      const payments = [{ from: 'b', to: 'a', amountPaise: 1000 }]
      expect(verifySettlement(balances, payments)).toBe(true)
    })

    it('returns false for invalid settlement', () => {
      const balances: MemberBalance[] = [
        { memberId: 'a', name: 'A', netPaise: 1000 },
        { memberId: 'b', name: 'B', netPaise: -1000 },
      ]
      const payments = [{ from: 'b', to: 'a', amountPaise: 500 }]
      expect(verifySettlement(balances, payments)).toBe(false)
    })
  })
})