import { z } from 'zod'

export const createTripSchema = z.object({
  name: z.string().min(1).max(100),
})

export const addMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  upiId: z.string().max(100).optional().nullable(),
})

export const createExpenseSchema = z.object({
  paidBy: z.string().min(1),
  amountPaise: z.number().int().positive(),
  category: z.string().min(1).max(50),
  description: z.string().max(500).optional().nullable(),
  splitType: z.enum(['equal', 'exact', 'percent']),
  splitAmong: z.array(z.string().min(1)).min(1),
  splitValues: z.record(z.string(), z.number().int().nonnegative()).optional(),
})

export const recordPaymentSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountPaise: z.number().int().positive(),
})

export const settleQuerySchema = z.object({
  mode: z.enum(['greedy', 'optimal']).optional(),
})