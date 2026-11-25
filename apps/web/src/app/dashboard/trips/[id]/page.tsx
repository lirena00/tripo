import { RiAddLine, RiMapPin2Line } from "@remixicon/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BackLink } from "@/components/trips/back-link";
import { TripActivity } from "@/components/trips/trip-activity";
import { TripExpenses } from "@/components/trips/trip-expenses";
import { TripMembers } from "@/components/trips/trip-members";
import { TripSettlement } from "@/components/trips/trip-settlement";
import { TripTabs, type TripView } from "@/components/trips/trip-tabs";
import { getCurrentUser } from "@/lib/session";
import { getTripSettlement } from "@/lib/trip-ledger";
import {
	getTripActivity,
	getTripExpenses,
	getTripMembership,
} from "@/lib/trip-queries";

export const metadata: Metadata = { title: "Trip | Tripo" };

export default async function TripPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ view?: string | string[] }>;
}) {
	const [viewer, { id }, { view }] = await Promise.all([
		getCurrentUser(),
		params,
		searchParams,
	]);
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
	const selected =
		view === "members" || view === "activity" || view === "settle"
			? view
			: "expenses";
	const tripHref = `/dashboard/trips/${id}` as const;
	return (
		<>
			<BackLink href="/dashboard">Your trips</BackLink>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<h1 className="wrap-anywhere font-heading text-3xl tracking-tight sm:text-4xl">
						{trip.name}
					</h1>
					{trip.destination ? (
						<p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
							<RiMapPin2Line aria-hidden="true" className="size-4 shrink-0" />
							<span className="wrap-anywhere">{trip.destination}</span>
						</p>
					) : null}
				</div>
				<Link className="site-button" href={`${tripHref}/expenses/new`}>
					<RiAddLine aria-hidden="true" className="size-4" />
					Add expense
				</Link>
			</div>
			<TripTabs selected={selected} tripId={id}>
				<TripSection
					currency={trip.currency}
					id={id}
					name={trip.name}
					owner={trip.role === "owner"}
					selected={selected}
				/>
			</TripTabs>
		</>
	);
}

async function TripSection({
	currency,
	id,
	name,
	owner,
	selected,
}: {
	currency: string;
	id: string;
	name: string;
	owner: boolean;
	selected: TripView;
}) {
	if (selected === "activity") {
		return <TripActivity events={await getTripActivity(id)} tripName={name} />;
	}
	if (selected === "members") {
		return <TripMembers owner={owner} tripId={id} />;
	}
	if (selected === "settle") {
		return (
			<TripSettlement currency={currency} plan={await getTripSettlement(id)} />
		);
	}
	return (
		<TripExpenses currency={currency} expenses={await getTripExpenses(id)} />
	);
}
