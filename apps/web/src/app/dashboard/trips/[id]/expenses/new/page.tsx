import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/trips/back-link";
import { ExpenseForm } from "@/components/trips/expense-form";
import { getCurrentUser } from "@/lib/session";
import {
	getTripCategories,
	getTripMembers,
	getTripMembership,
} from "@/lib/trip-queries";

export const metadata: Metadata = { title: "Add expense | Tripo" };

export default async function NewExpensePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [viewer, { id }] = await Promise.all([getCurrentUser(), params]);
	if (!viewer) {
		redirect("/login");
	}
	if (!z.uuid().safeParse(id).success) {
		notFound();
	}
	const trip = await getTripMembership(id, viewer.id);
	if (!trip) {
		notFound();
	}
	const [categories, members] = await Promise.all([
		getTripCategories(id),
		getTripMembers(id),
	]);
	return (
		<div className="max-w-2xl">
			<BackLink href={`/dashboard/trips/${id}`}>{trip.name}</BackLink>
			<h1 className="mb-7 font-heading text-3xl tracking-tight sm:text-4xl">
				Add expense
			</h1>
			<ExpenseForm
				categories={categories}
				currency={trip.currency}
				defaultPayer={trip.memberId}
				members={members}
				tripId={id}
			/>
		</div>
	);
}
