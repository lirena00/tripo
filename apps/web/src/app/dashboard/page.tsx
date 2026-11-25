import { RiAddLine, RiArrowRightSLine, RiSuitcase2Line } from "@remixicon/react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { getUserTrips } from "@/lib/trip-queries";

export const metadata: Metadata = { title: "Trips | Tripo" };

export default async function DashboardPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	const trips = await getUserTrips(user.id);
	return (
		<>
			<div className="mb-8 flex items-center justify-between gap-4">
				<h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Your trips</h1>
				<Link className="site-button" href="/dashboard/new">
					<RiAddLine aria-hidden="true" className="size-4" />
					New trip
				</Link>
			</div>
			{trips.length ? (
				<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
					{trips.map(({ id, name, destination, role }) => (
						<li key={id}>
							<Link className="group flex min-h-20 items-center gap-4 px-4 py-3 hover:bg-muted/50 focus-visible:outline-offset-[-3px] sm:px-5" href={`/dashboard/trips/${id}`}>
								<span className="feature-dither grid size-11 shrink-0 place-items-center rounded-lg text-primary">
									<RiSuitcase2Line aria-hidden="true" className="size-5" />
								</span>
								<span className="grid min-w-0 flex-1 gap-1">
									<span className="wrap-anywhere font-medium">{name}</span>
									<span className="truncate text-muted-foreground text-sm">{destination || (role === "owner" ? "Owner" : "Member")}</span>
								</span>
								<RiArrowRightSLine aria-hidden="true" className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" />
							</Link>
						</li>
					))}
				</ul>
			) : (
				<div className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-[1fr_10rem]">
					<div className="px-5 py-9 sm:px-8">
						<h2 className="font-heading text-xl">No trips yet</h2>
						<p className="mt-2 max-w-sm text-muted-foreground text-sm leading-relaxed">Create a trip to invite people and track expenses together.</p>
					</div>
					<div aria-hidden="true" className="feature-dither hidden place-items-center text-primary sm:grid">
						<RiSuitcase2Line className="size-10" />
					</div>
				</div>
			)}
		</>
	);
}
