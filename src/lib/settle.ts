import type { MemberBalance } from './balances'

export interface Payment {
  from: string
  to: string
  amountPaise: number
}

export interface SettleResult {
  mode: 'greedy' | 'optimal'
  payments: Payment[]
  paymentCount: number
  greedyCount: number
  naivePairwiseCount: number
}

export function greedySettle(balances: MemberBalance[]): Payment[] {
  const creditors = balances
    .filter((b) => b.netPaise > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.netPaise - a.netPaise)

  const debtors = balances
    .filter((b) => b.netPaise < 0)
    .map((b) => ({ ...b, netPaise: -b.netPaise }))
    .sort((a, b) => b.netPaise - a.netPaise)

  const payments: Payment[] = []
  let cIdx = 0
  let dIdx = 0

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx]
    const debtor = debtors[dIdx]
    const amount = Math.min(creditor.netPaise, debtor.netPaise)

    payments.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amountPaise: amount,
    })

    creditor.netPaise -= amount
    debtor.netPaise -= amount

    if (creditor.netPaise === 0) cIdx++
    if (debtor.netPaise === 0) dIdx++
  }

  return payments
}

function sumMask(nets: number[], mask: number): number {
  let sum = 0
  for (let i = 0; i < nets.length; i++) {
    if (mask & (1 << i)) sum += nets[i]
  }
  return sum
}

export function optimalSettle(balances: MemberBalance[]): Payment[] {
  const nonZero = balances.filter((b) => b.netPaise !== 0)
  const n = nonZero.length

  if (n <= 1) return []

  if (n > 15) {
    return greedySettle(balances)
  }

  const nets = nonZero.map((b) => b.netPaise)
  const totalMasks = 1 << n

  const dp = new Array(totalMasks).fill(-Infinity)
  const parent = new Array(totalMasks).fill(-1)
  dp[0] = 0

  for (let mask = 1; mask < totalMasks; mask++) {
    const maskSum = sumMask(nets, mask)
    if (maskSum !== 0) continue

    let submask = mask
    while (submask > 0) {
      const prevMask = mask ^ submask
      if (dp[prevMask] !== -Infinity) {
        const candidate = dp[prevMask] + 1
        if (candidate > dp[mask]) {
          dp[mask] = candidate
          parent[mask] = submask
        }
      }
      submask = (submask - 1) & mask
    }
  }

  const fullMask = totalMasks - 1
  if (dp[fullMask] === -Infinity) {
    return greedySettle(balances)
  }

  const groups: number[][] = []
  let currentMask = fullMask
  while (currentMask > 0) {
    const groupMask = parent[currentMask]
    const group: number[] = []
    for (let i = 0; i < n; i++) {
      if (groupMask & (1 << i)) group.push(i)
    }
    groups.push(group)
    currentMask ^= groupMask
  }

  const allPayments: Payment[] = []

  for (const group of groups) {
    const groupBalances: MemberBalance[] = group.map((idx) => nonZero[idx])
    const groupPayments = greedySettle(groupBalances)
    allPayments.push(...groupPayments)
  }

  return allPayments
}

export function naivePairwiseCount(expenses: { paidById: string; shares: { memberId: string; sharePaise: number }[] }[]): number {
  const pairNet = new Map<string, number>()

  for (const expense of expenses) {
    const payer = expense.paidById
    for (const share of expense.shares) {
      if (share.memberId === payer) continue
      const key = payer < share.memberId ? `${payer}|${share.memberId}` : `${share.memberId}|${payer}`
      const sign = payer < share.memberId ? 1 : -1
      pairNet.set(key, (pairNet.get(key) ?? 0) + sign * share.sharePaise)
    }
  }

  let count = 0
  for (const net of pairNet.values()) {
    if (net !== 0) count++
  }
  return count
}

export function applyPayments(balances: MemberBalance[], payments: Payment[]): MemberBalance[] {
  const netMap = new Map(balances.map((b) => [b.memberId, b.netPaise]))

  for (const payment of payments) {
    // from (debtor) pays -> their net increases (less negative)
    // to (creditor) receives -> their net decreases (less positive)
    netMap.set(payment.from, (netMap.get(payment.from) ?? 0) + payment.amountPaise)
    netMap.set(payment.to, (netMap.get(payment.to) ?? 0) - payment.amountPaise)
  }

  return balances.map((b) => ({
    ...b,
    netPaise: netMap.get(b.memberId) ?? 0,
  }))
}

export function verifySettlement(balances: MemberBalance[], payments: Payment[]): boolean {
  const final = applyPayments(balances, payments)
  return final.every((b) => b.netPaise === 0)
}