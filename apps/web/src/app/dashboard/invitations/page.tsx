import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PersonAvatar } from "@/components/person-avatar";
import { BackLink } from "@/components/trips/back-link";
import { InvitationActions } from "@/components/trips/invitation-actions";
import { getCurrentUser } from "@/lib/session";
import { getInvitationInbox } from "@/lib/trip-queries";

export const metadata: Metadata = { title: "Invitations | Tripo" };

export default async function InvitationInboxPage() {
	const viewer = await getCurrentUser();
	if (!viewer) {
		redirect("/login");
	}
	const invitations = await getInvitationInbox(viewer.id);
	return (
		<>
			<BackLink href="/dashboard">Your trips</BackLink>
			<h1 className="mb-7 font-heading text-3xl tracking-tight sm:text-4xl">Invitations</h1>
			{invitations.length ? (
				<ul className="divide-y divide-border border-border border-y">
					{invitations.map(({ id, inviterId, inviterName, tripName }) => (
						<li className="flex flex-wrap items-center justify-between gap-4 py-4" key={id}>
							<div className="flex min-w-0 items-center gap-3">
								<PersonAvatar id={inviterId} />
								<div className="min-w-0">
									<p className="wrap-anywhere font-medium">{tripName}</p>
									<p className="wrap-anywhere text-muted-foreground text-sm">Invited by {inviterName}</p>
								</div>
							</div>
							<InvitationActions id={id} />
						</li>
					))}
				</ul>
			) : <p className="text-muted-foreground text-sm">You have no pending invitations.</p>}
		</>
	);
}
