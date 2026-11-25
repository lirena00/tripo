import {
	expense,
	expenseCategory,
	expenseSplit,
	trip,
	tripActivity,
	tripInvitation,
	tripMember,
	user,
} from "@tripo/db/schema/index";
import { and, count, desc, eq, ne, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/services";

const invitee = alias(user, "invitee");

export function getUserTrips(userId: string) {
	return db
		.select({
			destination: trip.destination,
			id: trip.id,
			name: trip.name,
			role: tripMember.role,
		})
		.from(tripMember)
		.innerJoin(trip, eq(trip.id, tripMember.tripId))
		.where(eq(tripMember.userId, userId))
		.orderBy(desc(trip.createdAt));
}

export async function getTripMembership(tripId: string, userId: string) {
	const [membership] = await db
		.select({
			currency: trip.currency,
			destination: trip.destination,
			id: trip.id,
			memberId: tripMember.id,
			name: trip.name,
			role: tripMember.role,
		})
		.from(tripMember)
		.innerJoin(trip, eq(trip.id, tripMember.tripId))
		.where(and(eq(trip.id, tripId), eq(tripMember.userId, userId)))
		.limit(1);
	return membership;
}

export function getTripMembers(tripId: string) {
	return db
		.select({
			id: tripMember.id,
			name: user.name,
			role: tripMember.role,
			userId: user.id,
		})
		.from(tripMember)
		.innerJoin(user, eq(user.id, tripMember.userId))
		.where(eq(tripMember.tripId, tripId))
		.orderBy(tripMember.joinedAt, tripMember.id);
}

export function getTripCategories(tripId: string) {
	return db
		.select({
			icon: expenseCategory.icon,
			id: expenseCategory.id,
			name: expenseCategory.name,
		})
		.from(expenseCategory)
		.where(eq(expenseCategory.tripId, tripId))
		.orderBy(expenseCategory.name);
}

export function getTripInvitations(tripId: string) {
	return db
		.select({ id: tripInvitation.id, name: invitee.name })
		.from(tripInvitation)
		.innerJoin(invitee, eq(invitee.id, tripInvitation.inviteeId))
		.where(
			and(
				eq(tripInvitation.tripId, tripId),
				eq(tripInvitation.status, "pending")
			)
		)
		.orderBy(desc(tripInvitation.createdAt));
}

export function getInvitationInbox(userId: string) {
	return db
		.select({
			createdAt: tripInvitation.createdAt,
			id: tripInvitation.id,
			inviterId: user.id,
			inviterName: user.name,
			tripName: trip.name,
		})
		.from(tripInvitation)
		.innerJoin(trip, eq(trip.id, tripInvitation.tripId))
		.innerJoin(user, eq(user.id, tripInvitation.inviterId))
		.where(
			and(
				eq(tripInvitation.inviteeId, userId),
				eq(tripInvitation.status, "pending")
			)
		)
		.orderBy(desc(tripInvitation.createdAt));
}

export async function getPendingInvitationCount(userId: string) {
	const [row] = await db
		.select({ count: count() })
		.from(tripInvitation)
		.where(
			and(
				eq(tripInvitation.inviteeId, userId),
				eq(tripInvitation.status, "pending")
			)
		);
	return row?.count ?? 0;
}

export function findInvitableUsers(
	tripId: string,
	viewerId: string,
	query: string
) {
	const term = query.toLowerCase();
	return db
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(
			and(
				ne(user.id, viewerId),
				or(
					sql`strpos(lower(${user.name}), ${term}) > 0`,
					sql`lower(${user.email}) = ${term}`
				),
				notExists(
					db
						.select({ id: tripMember.id })
						.from(tripMember)
						.where(
							and(eq(tripMember.tripId, tripId), eq(tripMember.userId, user.id))
						)
				),
				notExists(
					db
						.select({ id: tripInvitation.id })
						.from(tripInvitation)
						.where(
							and(
								eq(tripInvitation.tripId, tripId),
								eq(tripInvitation.inviteeId, user.id),
								eq(tripInvitation.status, "pending")
							)
						)
				)
			)
		)
		.orderBy(user.name, user.id)
		.limit(8);
}

export async function getTripExpenses(tripId: string) {
	const [expenses, splits] = await Promise.all([
		db
			.select({
				amountPaise: expense.amountPaise,
				category: expenseCategory.name,
				icon: expenseCategory.icon,
				id: expense.id,
				location: expense.location,
				payer: user.name,
				payerId: expense.paidById,
				spentOn: expense.spentOn,
				splitType: expense.splitType,
				title: expense.title,
			})
			.from(expense)
			.innerJoin(expenseCategory, eq(expenseCategory.id, expense.categoryId))
			.innerJoin(tripMember, eq(tripMember.id, expense.paidById))
			.innerJoin(user, eq(user.id, tripMember.userId))
			.where(eq(expense.tripId, tripId))
			.orderBy(desc(expense.spentOn), desc(expense.createdAt)),
		db
			.select({
				expenseId: expenseSplit.expenseId,
				memberId: expenseSplit.memberId,
				name: user.name,
				sharePaise: expenseSplit.sharePaise,
			})
			.from(expenseSplit)
			.innerJoin(expense, eq(expense.id, expenseSplit.expenseId))
			.innerJoin(tripMember, eq(tripMember.id, expenseSplit.memberId))
			.innerJoin(user, eq(user.id, tripMember.userId))
			.where(eq(expense.tripId, tripId))
			.orderBy(user.name, expenseSplit.memberId),
	]);
	const splitsByExpense = Map.groupBy(splits, (split) => split.expenseId);
	return expenses.map((item) => ({
		...item,
		shares: splitsByExpense.get(item.id) ?? [],
	}));
}

export function getTripActivity(tripId: string) {
	return db
		.select({
			action: tripActivity.action,
			actor: user.name,
			createdAt: tripActivity.createdAt,
			id: tripActivity.id,
			spentOn: expense.spentOn,
			subject: tripActivity.subject,
		})
		.from(tripActivity)
		.innerJoin(user, eq(user.id, tripActivity.actorId))
		.leftJoin(expense, eq(expense.id, tripActivity.expenseId))
		.where(eq(tripActivity.tripId, tripId))
		.orderBy(desc(tripActivity.createdAt), desc(tripActivity.id));
}
