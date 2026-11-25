export type SplitType = 'equal' | 'exact' | 'percent'

export interface SplitInput {
  splitType: SplitType
  splitAmong: string[]
  splitValues?: Record<string, number>
}

export interface ComputedShare {
  memberId: string
  sharePaise: number
}

export function computeShares(
  amountPaise: number,
  input: SplitInput,
  memberIds: string[]
): ComputedShare[] {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Amount must be a positive integer (paise)')
  }

  if (input.splitAmong.length === 0) {
    throw new Error('splitAmong cannot be empty')
  }

  const invalidMembers = input.splitAmong.filter(
    (id) => !memberIds.includes(id)
  )
  if (invalidMembers.length > 0) {
    throw new Error(`Invalid members in splitAmong: ${invalidMembers.join(', ')}`)
  }

  const sortedMemberIds = [...input.splitAmong].sort()

  switch (input.splitType) {
    case 'equal':
      return computeEqualShares(amountPaise, sortedMemberIds)
    case 'exact':
      return computeExactShares(amountPaise, input.splitValues ?? {}, sortedMemberIds)
    case 'percent':
      return computePercentShares(amountPaise, input.splitValues ?? {}, sortedMemberIds)
    default:
      throw new Error(`Unknown splitType: ${input.splitType}`)
  }
}

function computeEqualShares(
  amountPaise: number,
  memberIds: string[]
): ComputedShare[] {
  const n = memberIds.length
  const baseShare = Math.floor(amountPaise / n)
  const remainder = amountPaise % n

  return memberIds.map((memberId, index) => ({
    memberId,
    sharePaise: baseShare + (index < remainder ? 1 : 0),
  }))
}

function computeExactShares(
  amountPaise: number,
  splitValues: Record<string, number>,
  memberIds: string[]
): ComputedShare[] {
  const providedMemberIds = Object.keys(splitValues).sort()
  const expectedMemberIds = [...memberIds].sort()

  if (providedMemberIds.length !== expectedMemberIds.length ||
      providedMemberIds.some((id, i) => id !== expectedMemberIds[i])) {
    throw new Error('splitValues must have exactly the same members as splitAmong')
  }

  const sum = Object.values(splitValues).reduce((acc, v) => acc + v, 0)
  if (sum !== amountPaise) {
    throw new Error(`Exact shares sum (${sum}) must equal amount (${amountPaise})`)
  }

  return memberIds.map((memberId) => ({
    memberId,
    sharePaise: splitValues[memberId] ?? 0,
  }))
}

function computePercentShares(
  amountPaise: number,
  splitValues: Record<string, number>,
  memberIds: string[]
): ComputedShare[] {
  const providedMemberIds = Object.keys(splitValues).sort()
  const expectedMemberIds = [...memberIds].sort()

  if (providedMemberIds.length !== expectedMemberIds.length ||
      providedMemberIds.some((id, i) => id !== expectedMemberIds[i])) {
    throw new Error('splitValues must have exactly the same members as splitAmong')
  }

  const percentSum = Object.values(splitValues).reduce((acc, v) => acc + v, 0)
  if (percentSum !== 100) {
    throw new Error(`Percent shares sum (${percentSum}) must equal 100`)
  }

  const shares = memberIds.map((memberId) => {
    const percent = splitValues[memberId] ?? 0
    const share = Math.floor((amountPaise * percent) / 100)
    return { memberId, sharePaise: share }
  })

  let total = shares.reduce((acc, s) => acc + s.sharePaise, 0)
  let remainder = amountPaise - total

  for (let i = 0; i < memberIds.length && remainder > 0; i++) {
    shares[i].sharePaise += 1
    remainder -= 1
  }

  return shares
}

export function validateSharesSum(shares: ComputedShare[], amountPaise: number): void {
  const sum = shares.reduce((acc, s) => acc + s.sharePaise, 0)
  if (sum !== amountPaise) {
    throw new Error(`Shares sum (${sum}) does not equal amount (${amountPaise})`)
  }
}