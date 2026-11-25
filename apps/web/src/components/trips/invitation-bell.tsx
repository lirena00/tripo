"use client";

import { RiNotification3Line } from "@remixicon/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const REFRESH_MS = 30_000;

export function InvitationBell({ pending }: { pending: number }) {
	const [latest, setLatest] = useState<{ initial: number; count: number }>();
	const count = latest?.initial === pending ? latest.count : pending;

	useEffect(() => {
		const controller = new AbortController();
		async function refresh() {
			if (document.visibilityState !== "visible") {
				return;
			}
			try {
				const response = await fetch("/api/invitations/count", { signal: controller.signal });
				if (response.ok) {
					const data: { count: number } = await response.json();
					setLatest({ initial: pending, count: data.count });
				}
			} catch {
				// Keep the last count when the browser is offline.
			}
		}
		const interval = window.setInterval(refresh, REFRESH_MS);
		document.addEventListener("visibilitychange", refresh);
		return () => {
			controller.abort();
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [pending]);

	return (
		<Link aria-label={`Invitations, ${count} pending`} className="relative grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" href="/dashboard/invitations">
			<RiNotification3Line aria-hidden="true" className="size-5" />
			{count > 0 ? <span aria-hidden="true" className="absolute top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground tabular-nums">{count > 99 ? "99+" : count}</span> : null}
		</Link>
	);
}
