import { describe, it, expect } from 'vitest'
import { computeBalances } from '../src/lib/balances'

describe('balances.ts', () => {
  const members = [
    { id: 'm1', name: 'Aman' },
    { id: 'm2', name: 'Bhavna' },
    { id: 'm3', name: 'Chirag' },
    { id: 'm4', name: 'Divya' },
  ]

  const expenses = [
    {
      id: 'e1',
      paidById: 'm1',
      amountPaise: 600000,
      shares: [
        { memberId: 'm1', sharePaise: 150000 },
        { memberId: 'm2', sharePaise: 150000 },
        { memberId: 'm3', sharePaise: 150000 },
        { memberId: 'm4', sharePaise: 150000 },
      ],
    },
    {
      id: 'e2',
      paidById: 'm2',
      amountPaise: 180000,
      shares: [
        { memberId: 'm1', sharePaise: 60000 },
        { memberId: 'm2', sharePaise: 60000 },
        { memberId: 'm3', sharePaise: 60000 },
      ],
    },
    {
      id: 'e3',
      paidById: 'm3',
      amountPaise: 120000,
      shares: [
        { memberId: 'm1', sharePaise: 30000 },
        { memberId: 'm2', sharePaise: 30000 },
        { memberId: 'm3', sharePaise: 30000 },
        { memberId: 'm4', sharePaise: 30000 },
      ],
    },
  ]

  it('gate case: computes correct nets', () => {
    const balances = computeBalances(members, expenses, [])

    const aman = balances.find(b => b.memberId === 'm1')!
    const bhavna = balances.find(b => b.memberId === 'm2')!
    const chirag = balances.find(b => b.memberId === 'm3')!
    const divya = balances.find(b => b.memberId === 'm4')!

    expect(aman.netPaise).toBe(360000)   // paid 600000, share 240000
    expect(bhavna.netPaise).toBe(-60000) // paid 180000, share 240000
    expect(chirag.netPaise).toBe(-120000) // paid 120000, share 240000
    expect(divya.netPaise).toBe(-180000)  // paid 0, share 180000
  })

  it('balances sum to zero', () => {
    const balances = computeBalances(members, expenses, [])
    const sum = balances.reduce((acc, b) => acc + b.netPaise, 0)
    expect(sum).toBe(0)
  })

  it('payments adjust balances correctly', () => {
    const payments = [
      { fromMemberId: 'm2', toMemberId: 'm1', amountPaise: 60000 },
      { fromMemberId: 'm3', toMemberId: 'm1', amountPaise: 120000 },
      { fromMemberId: 'm4', toMemberId: 'm1', amountPaise: 180000 },
    ]
    const balances = computeBalances(members, expenses, payments)

    // After payments, everyone should be at zero
    for (const b of balances) {
      expect(b.netPaise).toBe(0)
    }
  })

  it('handles member with no expenses', () => {
    const membersWithExtra = [...members, { id: 'm5', name: 'Extra' }]
    const balances = computeBalances(membersWithExtra, expenses, [])
    const extra = balances.find(b => b.memberId === 'm5')!
    expect(extra.netPaise).toBe(0)
  })
})