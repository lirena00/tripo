import { describe, it, expect } from 'vitest'
import { computeShares } from '../src/lib/splits'

describe('Validation tests (400 errors)', () => {
  const memberIds = ['m1', 'm2', 'm3', 'm4']

  it('bad percent sum returns error', () => {
    expect(() => computeShares(10000, {
      splitType: 'percent',
      splitAmong: ['m1', 'm2'],
      splitValues: { m1: 50, m2: 40 },
    }, memberIds)).toThrow('Percent shares sum')
  })

  it('exact sum mismatch returns error', () => {
    expect(() => computeShares(10000, {
      splitType: 'exact',
      splitAmong: ['m1', 'm2'],
      splitValues: { m1: 5000, m2: 4000 },
    }, memberIds)).toThrow('Exact shares sum')
  })

  it('empty splitAmong returns error', () => {
    expect(() => computeShares(10000, {
      splitType: 'equal',
      splitAmong: [],
    }, memberIds)).toThrow('splitAmong cannot be empty')
  })

  it('non-member in splitAmong returns error', () => {
    expect(() => computeShares(10000, {
      splitType: 'equal',
      splitAmong: ['m1', 'm99'],
    }, memberIds)).toThrow('Invalid members in splitAmong')
  })

  it('amount <= 0 returns error', () => {
    expect(() => computeShares(0, {
      splitType: 'equal',
      splitAmong: ['m1'],
    }, memberIds)).toThrow('Amount must be a positive integer')

    expect(() => computeShares(-100, {
      splitType: 'equal',
      splitAmong: ['m1'],
    }, memberIds)).toThrow('Amount must be a positive integer')
  })

  it('percent splitValues keys mismatch splitAmong', () => {
    expect(() => computeShares(10000, {
      splitType: 'percent',
      splitAmong: ['m1', 'm2'],
      splitValues: { m1: 50, m3: 50 },
    }, memberIds)).toThrow('splitValues must have exactly the same members')
  })

  it('exact splitValues keys mismatch splitAmong', () => {
    expect(() => computeShares(10000, {
      splitType: 'exact',
      splitAmong: ['m1', 'm2'],
      splitValues: { m1: 5000, m3: 5000 },
    }, memberIds)).toThrow('splitValues must have exactly the same members')
  })
})