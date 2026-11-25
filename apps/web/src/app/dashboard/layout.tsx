import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TripoBrand } from "@/components/header";
import { InvitationBell } from "@/components/trips/invitation-bell";
import UserMenu from "@/components/user-menu";
import { getCurrentUser } from "@/lib/session";
import { getPendingInvitationCount } from "@/lib/trip-queries";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const viewer = await getCurrentUser();
	if (!viewer) {
		redirect("/login");
	}
	const pending = await getPendingInvitationCount(viewer.id);
	return (
		<>
			<header className="border-border border-b bg-background">
				<div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
					<TripoBrand />
					<nav aria-label="Dashboard navigation" className="flex items-center gap-2 sm:gap-4">
						<Link className="site-nav-link" href="/dashboard">Trips</Link>
						<InvitationBell pending={pending} />
						<UserMenu user={{ email: viewer.email, id: viewer.id, name: viewer.name }} />
					</nav>
				</div>
			</header>
			<main className="mx-auto w-full max-w-5xl px-5 pt-9 pb-16 sm:px-8 sm:pt-12" id="main-content" tabIndex={-1}>
				{children}
			</main>
		</>
	);
}
