import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	date,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const trip = pgTable("trips", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull(),
	destination: text(),
	currency: text().default("INR").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tripMember = pgTable("trip_members", {
	id: uuid().defaultRandom().primaryKey(),
	tripId: uuid("trip_id").notNull().references(() => trip.id, { onDelete: "cascade" }),
	userId: text("user_id").notNull().references(() => user.id),
	role: text({ enum: ["owner", "member"] }).notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("trip_members_trip_user_idx").on(table.tripId, table.userId),
	index("trip_members_user_idx").on(table.userId),
]);

export const tripInvitation = pgTable("trip_invitations", {
	id: uuid().defaultRandom().primaryKey(),
	tripId: uuid("trip_id").notNull().references(() => trip.id, { onDelete: "cascade" }),
	inviteeId: text("invitee_id").notNull().references(() => user.id),
	inviterId: text("inviter_id").notNull().references(() => user.id),
	status: text({ enum: ["pending", "accepted", "declined", "revoked"] }).default("pending").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	respondedAt: timestamp("responded_at", { withTimezone: true }),
}, (table) => [
	uniqueIndex("trip_invitations_pending_idx").on(table.tripId, table.inviteeId).where(sql`${table.status} = 'pending'`),
	index("trip_invitations_inbox_idx").on(table.inviteeId, table.status),
]);

export const expenseCategory = pgTable("expense_categories", {
	id: uuid().defaultRandom().primaryKey(),
	tripId: uuid("trip_id").notNull().references(() => trip.id, { onDelete: "cascade" }),
	name: text().notNull(),
	icon: text({ enum: ["travel", "hotel", "food", "entertainment", "other", "custom"] }).notNull(),
}, (table) => [
	uniqueIndex("expense_categories_trip_name_idx").on(table.tripId, sql`lower(${table.name})`),
]);

export const expense = pgTable("expenses", {
	id: uuid().defaultRandom().primaryKey(),
	tripId: uuid("trip_id").notNull().references(() => trip.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").notNull().references(() => expenseCategory.id),
	paidById: uuid("paid_by").notNull().references(() => tripMember.id),
	title: text().notNull(),
	location: text(),
	amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
	splitType: text("split_type", { enum: ["equal", "exact", "percent", "shares"] }).notNull(),
	spentOn: date("spent_on").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	check("expenses_positive_amount", sql`${table.amountPaise} > 0`),
	index("expenses_trip_date_idx").on(table.tripId, table.spentOn, table.createdAt),
]);

export const expenseSplit = pgTable("expense_splits", {
	expenseId: uuid("expense_id").notNull().references(() => expense.id, { onDelete: "cascade" }),
	memberId: uuid("member_id").notNull().references(() => tripMember.id),
	sharePaise: bigint("share_paise", { mode: "number" }).notNull(),
	splitValue: bigint("split_value", { mode: "number" }),
}, (table) => [
	check("expense_splits_nonnegative_share", sql`${table.sharePaise} >= 0`),
	primaryKey({ columns: [table.expenseId, table.memberId] }),
	index("expense_splits_member_idx").on(table.memberId),
]);

export const tripActivity = pgTable("trip_activity", {
	id: uuid().defaultRandom().primaryKey(),
	tripId: uuid("trip_id").notNull().references(() => trip.id, { onDelete: "cascade" }),
	actorId: text("actor_id").notNull().references(() => user.id),
	action: text({ enum: ["trip_created", "member_invited", "member_joined", "invite_declined", "invite_revoked", "expense_added", "category_added"] }).notNull(),
	subject: text().notNull(),
	expenseId: uuid("expense_id").references(() => expense.id),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("trip_activity_date_idx").on(table.tripId, table.createdAt)]);
