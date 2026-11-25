import { PersonAvatar } from "@/components/person-avatar";
import { getTripInvitations, getTripMembers } from "@/lib/trip-queries";
import { InvitationActions } from "./invitation-actions";
import { MemberInviteForm } from "./member-invite-form";

export async function TripMembers({
	owner,
	tripId,
}: {
	owner: boolean;
	tripId: string;
}) {
	const [members, invitations] = await Promise.all([
		getTripMembers(tripId),
		owner ? getTripInvitations(tripId) : [],
	]);
	return (
		<div className="grid gap-7">
			{owner ? <MemberInviteForm tripId={tripId} /> : null}
			<section aria-labelledby="members-heading">
				<h2 className="mb-2 font-medium" id="members-heading">
					Trip members
				</h2>
				<ul className="divide-y divide-border border-border border-y">
					{members.map(({ id, name, role, userId }) => (
						<li
							className="flex min-h-14 items-center justify-between gap-3 py-3"
							key={id}
						>
							<span className="flex min-w-0 items-center gap-3">
								<PersonAvatar id={userId} />
								<span className="wrap-anywhere text-sm">{name}</span>
							</span>
							<span className="text-muted-foreground text-xs">
								{role === "owner" ? "Owner" : "Member"}
							</span>
						</li>
					))}
				</ul>
			</section>
			{invitations.length ? (
				<section aria-labelledby="pending-heading">
					<h2 className="mb-2 font-medium" id="pending-heading">
						Pending invitations
					</h2>
					<ul className="divide-y divide-border border-border border-y">
						{invitations.map(({ id, name }) => (
							<li
								className="flex items-center justify-between gap-3 py-3"
								key={id}
							>
								<span className="wrap-anywhere min-w-0 text-sm">{name}</span>
								<InvitationActions id={id} owner />
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}
