import type { getTripActivity } from "@/lib/trip-queries";
import { formatTripDate } from "@/lib/trip-values";

type Activity = Awaited<ReturnType<typeof getTripActivity>>;

const eventVerbs = {
	category_added: "added the category",
	expense_added: "logged",
	invite_declined: "declined the invitation to",
	invite_revoked: "revoked the invitation for",
	member_invited: "invited",
	member_joined: "joined",
	trip_created: "created",
} satisfies Record<Activity[number]["action"], string>;

const eventDate = new Intl.DateTimeFormat("en", {
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
	month: "short",
	timeZone: "UTC",
	timeZoneName: "short",
	year: "numeric",
});

export function TripActivity({
	events,
	tripName,
}: {
	events: Activity;
	tripName: string;
}) {
	if (!events.length) {
		return (
			<p className="text-muted-foreground text-sm">
				No activity has been recorded.
			</p>
		);
	}
	return (
		<ol
			aria-label="Trip activity, newest first"
			className="divide-y divide-border border-border border-y"
		>
			{events.map(({ id, action, actor, subject, spentOn, createdAt }) => {
				const target =
					action === "member_joined" || action === "invite_declined"
						? tripName
						: subject;
				return (
					<li
						className="flex flex-wrap justify-between gap-x-6 gap-y-1.5 py-4"
						key={id}
					>
						<div className="min-w-0">
							<p className="wrap-anywhere text-sm">
								<strong className="font-medium">{actor}</strong>{" "}
								{eventVerbs[action]} {target}
							</p>
							{spentOn ? (
								<p className="mt-1 text-muted-foreground text-xs">
									Paid on{" "}
									<time dateTime={spentOn}>{formatTripDate(spentOn)}</time>
								</p>
							) : null}
						</div>
						<time
							className="shrink-0 text-muted-foreground text-xs tabular-nums"
							dateTime={createdAt.toISOString()}
						>
							{eventDate.format(createdAt)}
						</time>
					</li>
				);
			})}
		</ol>
	);
}
