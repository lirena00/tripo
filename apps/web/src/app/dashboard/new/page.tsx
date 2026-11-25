import type { Metadata } from "next";

import { BackLink } from "@/components/trips/back-link";
import { TripForm } from "@/components/trips/trip-form";

export const metadata: Metadata = { title: "New trip | Tripo" };

export default function NewTripPage() {
	return (
		<div className="max-w-md">
			<BackLink href="/dashboard">Your trips</BackLink>
			<h1 className="mb-7 font-heading text-3xl tracking-tight sm:text-4xl">New trip</h1>
			<TripForm />
		</div>
	);
}
