import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import MobileNavigation from "./mobile-navigation";
import UserMenu from "./user-menu";

export function TripoBrand() {
	return (
		<Link
			aria-label="Tripo home"
			className="inline-flex shrink-0 items-center gap-2.5 font-heading text-xl tracking-tight"
			href="/"
		>
			<svg
				aria-hidden="true"
				className="size-8 shrink-0 text-primary"
				focusable="false"
				viewBox="0 0 32 32"
			>
				<rect fill="currentColor" height="32" rx="8" width="32" />
				<path
					d="M7 8h18v2.5a2.25 2.25 0 0 0 0 4.5v1h-6v8l-1.5-1-1.5 1-1.5-1-1.5 1v-8H7v-1a2.25 2.25 0 0 0 0-4.5V8Z"
					fill="var(--background)"
				/>
				<path
					d="M13 17h6v7l-1.5-1-1.5 1-1.5-1-1.5 1v-7Z"
					fill="var(--accent)"
				/>
				<path
					d="M12.5 12h1.5v1.5h-1.5zM15.25 12h1.5v1.5h-1.5zM18 12h1.5v1.5H18z"
					fill="currentColor"
				/>
			</svg>
			Tripo
		</Link>
	);
}

export default async function Header() {
	const user = await getCurrentUser();
	const navigationLinks = (
		<>
			<Link className="site-nav-link" href="/#features">
				Features
			</Link>
			<Link className="site-nav-link" href="/#example-trip">
				Example trip
			</Link>
			{user ? (
				<Link className="site-nav-link" href="/dashboard">
					Dashboard
				</Link>
			) : null}
		</>
	);
	const getStarted = user ? null : (
		<Link className="site-button site-button--small" href="/signup">
			Get started
			<ArrowUpRight aria-hidden="true" className="size-4" />
		</Link>
	);

	return (
		<header className="site-width fixed inset-x-0 top-5 z-10 flex min-h-[62px] items-center justify-between gap-4 rounded-xl border border-border bg-background/97 py-2 pr-3 pl-5">
			<TripoBrand />
			<div className="flex items-center gap-1.5 md:gap-4">
				<nav
					aria-label="Main navigation"
					className="hidden items-center gap-4 md:flex"
				>
					{navigationLinks}
				</nav>
				{user ? (
					<UserMenu
						user={{ email: user.email, id: user.id, name: user.name }}
					/>
				) : (
					<>
						<Link
							className="site-button site-button--secondary site-button--small"
							href="/login"
						>
							Sign in
						</Link>
						<div className="hidden md:block">{getStarted}</div>
					</>
				)}
				<MobileNavigation>
					{navigationLinks}
					{getStarted}
				</MobileNavigation>
			</div>
		</header>
	);
}
