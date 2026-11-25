"use server";

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
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/session";
import { getTripMembership } from "@/lib/trip-queries";
import { computeShares } from "@/lib/trip-splits";
import { DEFAULT_CATEGORIES, parseMinorUnits, parseWholeShares, TRIP_CURRENCIES } from "@/lib/trip-values";
import { db } from "@/services";

const idSchema = z.uuid();
const newTripSchema = z.object({
	name: z.string().trim().min(1).max(100),
	destination: z.string().trim().max(100),
	currency: z.enum(TRIP_CURRENCIES),
});
const expenseSchema = z.object({
	title: z.string().trim().min(1).max(120),
	location: z.string().trim().max(120),
	amount: z.string().trim(),
	category: z.union([idSchema, z.literal("new")]),
	categoryName: z.string().trim().max(50),
	paidBy: idSchema,
	spentOn: z.iso.date(),
	splitType: z.enum(["equal", "exact", "percent", "shares"]),
	participants: z.array(idSchema).min(1).max(100),
});

function field(data: FormData, key: string) {
	const value = data.get(key);
	return typeof value === "string" ? value : "";
}

export async function createTrip(_previous: string, data: FormData) {
	const viewer = await getCurrentUser();
	if (!viewer) {
		return "Sign in to create a trip.";
	}
	const input = newTripSchema.safeParse({
		name: field(data, "name"),
		destination: field(data, "destination"),
		currency: field(data, "currency"),
	});
	if (!input.success) {
		return "Enter a trip name and choose a currency.";
	}
	const tripId = crypto.randomUUID();
	const { name, destination, currency } = input.data;
	await db.transaction(async (tx) => {
		await tx.insert(trip).values({ id: tripId, name, destination: destination || null, currency });
		await tx.insert(tripMember).values({ tripId, userId: viewer.id, role: "owner" });
		await tx.insert(expenseCategory).values(DEFAULT_CATEGORIES.map((category) => ({ ...category, tripId })));
		await tx.insert(tripActivity).values({ tripId, actorId: viewer.id, action: "trip_created", subject: name });
	});
	revalidatePath("/dashboard");
	redirect(`/dashboard/trips/${tripId}`);
}

export async function inviteMembers(tripId: string, _previous: string, data: FormData) {
	const viewer = await getCurrentUser();
	if (!viewer || !idSchema.safeParse(tripId).success) {
		return "Choose a trip to invite people to.";
	}
	const membership = await getTripMembership(tripId, viewer.id);
	if (membership?.role !== "owner") {
		return "Only the trip owner can invite people.";
	}
	const selected = z.array(z.string().min(1).max(128)).min(1).max(20)
		.safeParse(data.getAll("invitee"));
	if (!selected.success) {
		return "Select up to 20 people to invite.";
	}
	const inserted = await db.transaction(async (tx) => {
		await tx.select({ id: trip.id }).from(trip).where(eq(trip.id, tripId)).for("update");
		const candidates = await tx.select({ id: user.id, name: user.name })
			.from(user).where(inArray(user.id, selected.data));
		const members = await tx.select({ userId: tripMember.userId }).from(tripMember)
			.where(eq(tripMember.tripId, tripId));
		const memberIds = new Set(members.map((member) => member.userId));
		const eligible = candidates.filter((candidate) => !memberIds.has(candidate.id));
		if (!eligible.length) {
			return [];
		}
		const invitations = await tx.insert(tripInvitation).values(eligible.map(({ id }) => ({
			tripId, inviterId: viewer.id, inviteeId: id,
		}))).onConflictDoNothing().returning({ inviteeId: tripInvitation.inviteeId });
		if (invitations.length) {
			const names = new Map(eligible.map(({ id, name }) => [id, name]));
			await tx.insert(tripActivity).values(invitations.map(({ inviteeId }) => ({
				tripId, actorId: viewer.id, action: "member_invited" as const, subject: names.get(inviteeId) ?? "Member",
			})));
		}
		return invitations;
	});
	if (!inserted.length) {
		return "These people are already in the trip or have an invitation.";
	}
	revalidatePath(`/dashboard/trips/${tripId}`);
	return "";
}

export async function respondToInvitation(invitationId: string, _previous: string, data: FormData) {
	const viewer = await getCurrentUser();
	const response = z.enum(["accept", "decline", "revoke"]).safeParse(data.get("response"));
	if (!viewer || !response.success || !idSchema.safeParse(invitationId).success) {
		return "This invitation is unavailable.";
	}
	const revoke = response.data === "revoke";
	const accept = response.data === "accept";
	const status = revoke ? "revoked" : accept ? "accepted" : "declined";
	const [invitation] = await db.select({
		tripId: tripInvitation.tripId,
		inviteeId: tripInvitation.inviteeId,
		inviteeName: user.name,
	}).from(tripInvitation).innerJoin(user, eq(user.id, tripInvitation.inviteeId))
		.where(eq(tripInvitation.id, invitationId));
	if (!invitation) {
		return "This invitation is unavailable.";
	}
	const { tripId, inviteeId, inviteeName } = invitation;
	const authorized = revoke ? (await getTripMembership(tripId, viewer.id))?.role === "owner" : inviteeId === viewer.id;
	if (!authorized) {
		return "This invitation is unavailable.";
	}
	const updated = await db.transaction(async (tx) => {
		await tx.select({ id: trip.id }).from(trip).where(eq(trip.id, tripId)).for("update");
		const [changed] = await tx.update(tripInvitation).set({ status, respondedAt: new Date() })
			.where(and(eq(tripInvitation.id, invitationId), eq(tripInvitation.status, "pending")))
			.returning({ id: tripInvitation.id });
		if (!changed) {
			return false;
		}
		if (accept) {
			await tx.insert(tripMember).values({ tripId, userId: viewer.id, role: "member" }).onConflictDoNothing();
		}
		await tx.insert(tripActivity).values({
			tripId, actorId: viewer.id, subject: inviteeName,
			action: revoke ? "invite_revoked" : accept ? "member_joined" : "invite_declined",
		});
		return true;
	});
	if (!updated) {
		return "This invitation has already been handled.";
	}
	revalidatePath("/", "layout");
	if (accept) {
		redirect(`/dashboard/trips/${tripId}`);
	}
	return "";
}

function expenseInput(data: FormData) {
	return expenseSchema.safeParse({
		title: field(data, "title"),
		location: field(data, "location"),
		amount: field(data, "amount"),
		category: field(data, "category"),
		categoryName: field(data, "categoryName"),
		paidBy: field(data, "paidBy"),
		spentOn: field(data, "spentOn"),
		splitType: field(data, "splitType"),
		participants: data.getAll("participant"),
	});
}

function getSplitValues(input: z.infer<typeof expenseSchema>, data: FormData) {
	if (input.splitType === "equal") {
		return {};
	}
	const parse = input.splitType === "shares" ? parseWholeShares : parseMinorUnits;
	const values: Record<string, number> = {};
	for (const memberId of input.participants) {
		const value = parse(field(data, `share-${memberId}`).trim());
		if (value === undefined) {
			throw new Error("Enter a valid value for each selected member.");
		}
		values[memberId] = value;
	}
	return values;
}

export async function addExpense(tripId: string, _previous: string, data: FormData) {
	const viewer = await getCurrentUser();
	if (!viewer || !idSchema.safeParse(tripId).success || !(await getTripMembership(tripId, viewer.id))) {
		return "Join this trip before adding an expense.";
	}
	const parsed = expenseInput(data);
	if (!parsed.success) {
		return "Check the title, category, payer, date, and selected people.";
	}
	const input = parsed.data;
	const amountPaise = parseMinorUnits(input.amount);
	if (!amountPaise) {
		return "Enter an amount greater than zero with up to two decimal places.";
	}
	if (input.category === "new" && !input.categoryName) {
		return "Enter a name for the new category.";
	}
	const members = await db.select({ id: tripMember.id }).from(tripMember).where(eq(tripMember.tripId, tripId));
	const memberIds = members.map(({ id }) => id);
	if (!memberIds.includes(input.paidBy)) {
		return "Choose a payer from this trip.";
	}
	let split;
	let splitValues;
	try {
		splitValues = getSplitValues(input, data);
		split = computeShares(amountPaise, {
			splitType: input.splitType, splitAmong: input.participants, splitValues,
		}, memberIds);
	} catch (error) {
		return error instanceof Error ? error.message : "Check the split amounts.";
	}
	const expenseId = crypto.randomUUID();
	const saved = await db.transaction(async (tx) => {
		const newCategory = input.category === "new";
		if (newCategory) {
			const [created] = await tx.insert(expenseCategory).values({
				tripId, name: input.categoryName, icon: "custom",
			}).onConflictDoNothing().returning({ id: expenseCategory.id });
			if (created) {
				await tx.insert(tripActivity).values({
					tripId, actorId: viewer.id, action: "category_added", subject: input.categoryName,
				});
			}
		}
		const categoryCondition = newCategory
			? sql`lower(${expenseCategory.name}) = lower(${input.categoryName})`
			: eq(expenseCategory.id, input.category);
		const [category] = await tx.select({ id: expenseCategory.id }).from(expenseCategory)
			.where(and(eq(expenseCategory.tripId, tripId), categoryCondition));
		if (!category) {
			return false;
		}
		await tx.insert(expense).values({
			id: expenseId, tripId, categoryId: category.id, paidById: input.paidBy,
			title: input.title, location: input.location || null, spentOn: input.spentOn,
			amountPaise, splitType: input.splitType,
		});
		await tx.insert(expenseSplit).values(split.map((share) => ({
			...share, expenseId, splitValue: splitValues[share.memberId],
		})));
		await tx.insert(tripActivity).values({
			tripId, actorId: viewer.id, action: "expense_added", subject: input.title, expenseId,
		});
		return true;
	});
	if (!saved) {
		return "Choose a category from this trip.";
	}
	revalidatePath(`/dashboard/trips/${tripId}`);
	redirect(`/dashboard/trips/${tripId}`);
}
