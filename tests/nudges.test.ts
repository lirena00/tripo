import { describe, it, expect } from 'vitest'
import { generateNudges } from '../src/lib/nudges'
import type { Payment } from '../src/lib/settle'

describe('nudges.ts', () => {
  const members = [
    { id: 'm1', name: 'Aman', upiId: 'aman@fakebank' },
    { id: 'm2', name: 'Bhavna', upiId: 'bhavna@fakebank' },
    { id: 'm3', name: 'Chirag', upiId: null },
    { id: 'm4', name: 'Divya', upiId: 'divya@fakebank' },
  ]

  const payments: Payment[] = [
    { from: 'm2', to: 'm1', amountPaise: 60000 },
    { from: 'm3', to: 'm1', amountPaise: 120000 },
    { from: 'm4', to: 'm1', amountPaise: 180000 },
  ]

  it('generates correct messages and UPI links', () => {
    const nudges = generateNudges(payments, members)

    expect(nudges[0]).toEqual({
      from: 'm2',
      to: 'm1',
      amountPaise: 60000,
      message: 'Bhavna owes Aman ₹600.00',
      upiLink: 'upi://pay?pa=aman%40fakebank&pn=Aman&am=600.00&cu=INR',
    })

    expect(nudges[1]).toEqual({
      from: 'm3',
      to: 'm1',
      amountPaise: 120000,
      message: 'Chirag owes Aman ₹1200.00',
      upiLink: 'upi://pay?pa=aman%40fakebank&pn=Aman&am=1200.00&cu=INR',
    })

    expect(nudges[2]).toEqual({
      from: 'm4',
      to: 'm1',
      amountPaise: 180000,
      message: 'Divya owes Aman ₹1800.00',
      upiLink: 'upi://pay?pa=aman%40fakebank&pn=Aman&am=1800.00&cu=INR',
    })
  })

  it('handles missing upiId', () => {
    const payments: Payment[] = [{ from: 'm1', to: 'm3', amountPaise: 50000 }]
    const nudges = generateNudges(payments, members)
    expect(nudges[0].upiLink).toBeNull()
    expect(nudges[0].message).toBe('Aman owes Chirag ₹500.00')
  })

  it('formats paise to rupees correctly', () => {
    const payments: Payment[] = [
      { from: 'm1', to: 'm2', amountPaise: 100 },    // ₹1.00
      { from: 'm1', to: 'm2', amountPaise: 101 },    // ₹1.01
      { from: 'm1', to: 'm2', amountPaise: 110 },    // ₹1.10
      { from: 'm1', to: 'm2', amountPaise: 10000 },  // ₹100.00
    ]
    const nudges = generateNudges(payments, members)
    expect(nudges[0].message).toContain('₹1.00')
    expect(nudges[1].message).toContain('₹1.01')
    expect(nudges[2].message).toContain('₹1.10')
    expect(nudges[3].message).toContain('₹100.00')
  })
})