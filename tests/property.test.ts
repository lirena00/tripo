import { describe, it, expect } from 'vitest'
import { computeShares } from '../src/lib/splits'
import { computeBalances } from '../src/lib/balances'
import { greedySettle, optimalSettle, verifySettlement } from '../src/lib/settle'
import type { MemberBalance } from '../src/lib/balances'

// Simple seeded random for property tests
class SeededRandom {
  private seed: number
  constructor(seed: number) { this.seed = seed }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 0x100000000
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]
  }
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

describe('Property tests', () => {
  it('200 random trips: balances sum to 0, optimalCount <= greedyCount <= n-1', () => {
    for (let trip = 0; trip < 200; trip++) {
      const rng = new SeededRandom(10000 + trip)
      const memberCount = rng.nextInt(2, 8)
      const memberIds = Array.from({ length: memberCount }, (_, i) => `m${i}`)
      const members = memberIds.map(id => ({ id, name: `Member ${id}` }))

      // Generate random expenses
      const expenseCount = rng.nextInt(5, 20)
      const expenses = []

      for (let e = 0; e < expenseCount; e++) {
        const amountPaise = rng.nextInt(1000, 1000000)
        const paidBy = rng.pick(memberIds)
        const splitAmongCount = rng.nextInt(1, memberCount)
        const splitAmong = rng.shuffle(memberIds).slice(0, splitAmongCount)
        const splitType = rng.pick(['equal', 'exact', 'percent'] as const)

        let shares: { memberId: string; sharePaise: number }[]

        if (splitType === 'equal') {
          shares = computeShares(amountPaise, { splitType: 'equal', splitAmong }, memberIds)
        } else if (splitType === 'exact') {
          const values: Record<string, number> = {}
          let remaining = amountPaise
          for (let i = 0; i < splitAmong.length - 1; i++) {
            const share = rng.nextInt(1, remaining - (splitAmong.length - i - 1))
            values[splitAmong[i]] = share
            remaining -= share
          }
          values[splitAmong[splitAmong.length - 1]] = remaining
          shares = computeShares(amountPaise, { splitType: 'exact', splitAmong, splitValues: values }, memberIds)
        } else {
          const values: Record<string, number> = {}
          let remaining = 100
          for (let i = 0; i < splitAmong.length - 1; i++) {
            const pct = rng.nextInt(1, remaining - (splitAmong.length - i - 1))
            values[splitAmong[i]] = pct
            remaining -= pct
          }
          values[splitAmong[splitAmong.length - 1]] = remaining
          shares = computeShares(amountPaise, { splitType: 'percent', splitAmong, splitValues: values }, memberIds)
        }

        expenses.push({
          id: `e${e}`,
          paidById: paidBy,
          amountPaise,
          category: 'test',
          shares,
        })
      }

      // Compute balances
      const balances = computeBalances(members, expenses, [])

      // Check balances sum to zero
      const sum = balances.reduce((acc, b) => acc + b.netPaise, 0)
      expect(sum).toBe(0)

      // Test settlements
      const greedy = greedySettle(balances)
      const optimal = optimalSettle(balances)

      const nonZeroCount = balances.filter(b => b.netPaise !== 0).length

      // Verify settlements
      expect(verifySettlement(balances, greedy)).toBe(true)
      expect(verifySettlement(balances, optimal)).toBe(true)

      // Check counts
      expect(optimal.length).toBeLessThanOrEqual(greedy.length)
      expect(greedy.length).toBeLessThanOrEqual(Math.max(0, nonZeroCount - 1))
    }
  })

  it('equal split among 3 always sums to amount', () => {
    for (let amount = 1; amount <= 10000; amount++) {
      const shares = computeShares(amount, { splitType: 'equal', splitAmong: ['a', 'b', 'c'] }, ['a', 'b', 'c'])
      const sum = shares.reduce((acc, s) => acc + s.sharePaise, 0)
      expect(sum).toBe(amount)
    }
  })

  it('percent split always sums to amount', () => {
    const rng = new SeededRandom(999)
    for (let i = 0; i < 1000; i++) {
      const amount = rng.nextInt(1, 100000)
      const percents = [rng.nextInt(1, 98), rng.nextInt(1, 98), 0]
      percents[2] = 100 - percents[0] - percents[1]
      if (percents[2] <= 0) continue

      const shares = computeShares(amount, {
        splitType: 'percent',
        splitAmong: ['a', 'b', 'c'],
        splitValues: { a: percents[0], b: percents[1], c: percents[2] },
      }, ['a', 'b', 'c'])

      const sum = shares.reduce((acc, s) => acc + s.sharePaise, 0)
      expect(sum).toBe(amount)
    }
  })
})