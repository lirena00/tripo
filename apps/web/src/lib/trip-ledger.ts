import {
	expense,
	expenseSplit,
	tripMember,
	user,
} from "@tripo/db/schema/index";
import { eq, sql } from "drizzle-orm";

import { db } from "@/services";
import { getSettlementPlan } from "./trip-settlement";

// Adapted from feature/database's member_balances view. A single statement keeps
// expense totals and allocated shares on the same database snapshot.
export async function getTripSettlement(tripId: string) {
	const paid = db.$with("member_paid").as(
		db
			.select({
				memberId: expense.paidById,
				total: sql`sum(${expense.amountPaise})`.as("paid_total"),
			})
			.from(expense)
			.where(eq(expense.tripId, tripId))
			.groupBy(expense.paidById)
	);
	const owed = db.$with("member_owed").as(
		db
			.select({
				memberId: expenseSplit.memberId,
				total: sql`sum(${expenseSplit.sharePaise})`.as("owed_total"),
			})
			.from(expenseSplit)
			.innerJoin(expense, eq(expense.id, expenseSplit.expenseId))
			.where(eq(expense.tripId, tripId))
			.groupBy(expenseSplit.memberId)
	);
	const balances = await db
		.with(paid, owed)
		.select({
			memberId: tripMember.id,
			name: user.name,
			netPaise:
				sql`coalesce(${paid.total}, 0) - coalesce(${owed.total}, 0)`.mapWith(
					Number
				),
		})
		.from(tripMember)
		.innerJoin(user, eq(user.id, tripMember.userId))
		.leftJoin(paid, eq(paid.memberId, tripMember.id))
		.leftJoin(owed, eq(owed.memberId, tripMember.id))
		.where(eq(tripMember.tripId, tripId))
		.orderBy(tripMember.joinedAt, tripMember.id);
	return getSettlementPlan(balances);
}
