import type { Payment } from './settle'

export interface Nudge {
  from: string
  to: string
  amountPaise: number
  message: string
  upiLink: string | null
}

function paiseToRupees(paise: number): string {
  const rupees = Math.floor(paise / 100)
  const paiseRemainder = paise % 100
  return `${rupees}.${String(paiseRemainder).padStart(2, '0')}`
}

export function generateNudges(
  payments: Payment[],
  members: { id: string; name: string; upiId?: string | null }[]
): Nudge[] {
  const memberMap = new Map(members.map((m) => [m.id, m]))

  return payments.map((payment) => {
    const fromMember = memberMap.get(payment.from)
    const toMember = memberMap.get(payment.to)

    const fromName = fromMember?.name ?? payment.from
    const toName = toMember?.name ?? payment.to
    const rupees = paiseToRupees(payment.amountPaise)

    const message = `${fromName} owes ${toName} ₹${rupees}`

    let upiLink: string | null = null
    if (toMember?.upiId) {
      upiLink = `upi://pay?pa=${encodeURIComponent(toMember.upiId)}&pn=${encodeURIComponent(toName)}&am=${rupees}&cu=INR`
    }

    return {
      from: payment.from,
      to: payment.to,
      amountPaise: payment.amountPaise,
      message,
      upiLink,
    }
  })
}