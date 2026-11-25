import { describe, it, expect } from 'vitest'
import { computeShares, validateSharesSum } from '../src/lib/splits'

describe('splits.ts', () => {
  const memberIds = ['m1', 'm2', 'm3', 'm4']

  describe('equal split', () => {
    it('divides evenly', () => {
      const shares = computeShares(10000, { splitType: 'equal', splitAmong: ['m1', 'm2'] }, memberIds)
      expect(shares).toEqual([
        { memberId: 'm1', sharePaise: 5000 },
        { memberId: 'm2', sharePaise: 5000 },
      ])
    })

    it('distributes remainder to first members in sorted order', () => {
      const shares = computeShares(10000, { splitType: 'equal', splitAmong: ['m3', 'm1', 'm2'] }, memberIds)
      // sorted: m1, m2, m3 -> m1 gets +1
      expect(shares).toEqual([
        { memberId: 'm1', sharePaise: 3334 },
        { memberId: 'm2', sharePaise: 3333 },
        { memberId: 'm3', sharePaise: 3333 },
      ])
    })

    it('3-way split of 10000 sums to exactly 10000', () => {
      const shares = computeShares(10000, { splitType: 'equal', splitAmong: ['m1', 'm2', 'm3'] }, memberIds)
      const sum = shares.reduce((acc, s) => acc + s.sharePaise, 0)
      expect(sum).toBe(10000)
    })

    it('throws on empty splitAmong', () => {
      expect(() => computeShares(1000, { splitType: 'equal', splitAmong: [] }, memberIds))
        .toThrow('splitAmong cannot be empty')
    })

    it('throws on non-member in splitAmong', () => {
      expect(() => computeShares(1000, { splitType: 'equal', splitAmong: ['m1', 'm99'] }, memberIds))
        .toThrow('Invalid members in splitAmong')
    })

    it('throws on amount <= 0', () => {
      expect(() => computeShares(0, { splitType: 'equal', splitAmong: ['m1'] }, memberIds))
        .toThrow('Amount must be a positive integer')
      expect(() => computeShares(-100, { splitType: 'equal', splitAmong: ['m1'] }, memberIds))
        .toThrow('Amount must be a positive integer')
    })
  })

  describe('exact split', () => {
    it('accepts valid exact shares', () => {
      const shares = computeShares(10000, {
        splitType: 'exact',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 6000, m2: 4000 },
      }, memberIds)
      expect(shares).toEqual([
        { memberId: 'm1', sharePaise: 6000 },
        { memberId: 'm2', sharePaise: 4000 },
      ])
    })

    it('throws when sum != amount', () => {
      expect(() => computeShares(10000, {
        splitType: 'exact',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 5000, m2: 4000 },
      }, memberIds)).toThrow('Exact shares sum')
    })

    it('throws when splitValues keys mismatch splitAmong', () => {
      expect(() => computeShares(10000, {
        splitType: 'exact',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 5000, m3: 5000 },
      }, memberIds)).toThrow('splitValues must have exactly the same members')
    })
  })

  describe('percent split', () => {
    it('accepts valid percent shares', () => {
      const shares = computeShares(10000, {
        splitType: 'percent',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 60, m2: 40 },
      }, memberIds)
      expect(shares).toEqual([
        { memberId: 'm1', sharePaise: 6000 },
        { memberId: 'm2', sharePaise: 4000 },
      ])
    })

    it('distributes remainder paise in sorted order', () => {
      // 10000 * 33% = 3300, 33% = 3300, 34% = 3400 -> sum = 10000
      const shares = computeShares(10000, {
        splitType: 'percent',
        splitAmong: ['m3', 'm1', 'm2'],
        splitValues: { m1: 33, m2: 33, m3: 34 },
      }, memberIds)
      const sum = shares.reduce((acc, s) => acc + s.sharePaise, 0)
      expect(sum).toBe(10000)
      // sorted: m1, m2, m3
      expect(shares[0]).toEqual({ memberId: 'm1', sharePaise: 3300 })
      expect(shares[1]).toEqual({ memberId: 'm2', sharePaise: 3300 })
      expect(shares[2]).toEqual({ memberId: 'm3', sharePaise: 3400 })
    })

    it('throws when percent sum != 100', () => {
      expect(() => computeShares(10000, {
        splitType: 'percent',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 50, m2: 40 },
      }, memberIds)).toThrow('Percent shares sum')
    })

    it('throws when splitValues keys mismatch splitAmong', () => {
      expect(() => computeShares(10000, {
        splitType: 'percent',
        splitAmong: ['m1', 'm2'],
        splitValues: { m1: 50, m3: 50 },
      }, memberIds)).toThrow('splitValues must have exactly the same members')
    })
  })

  describe('validateSharesSum', () => {
    it('passes when sum matches', () => {
      expect(() => validateSharesSum([{ memberId: 'm1', sharePaise: 5000 }, { memberId: 'm2', sharePaise: 5000 }], 10000))
        .not.toThrow()
    })

    it('throws when sum mismatches', () => {
      expect(() => validateSharesSum([{ memberId: 'm1', sharePaise: 5000 }], 10000))
        .toThrow('Shares sum')
    })
  })
})