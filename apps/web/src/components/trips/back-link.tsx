import { RiArrowLeftLine } from "@remixicon/react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink<T extends string>({
	children,
	href,
}: {
	children: ReactNode;
	href: Route<T>;
}) {
	return (
		<Link
			className="mb-4 inline-flex min-h-8 items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
			href={href}
		>
			<RiArrowLeftLine aria-hidden="true" className="size-4" />
			{children}
		</Link>
	);
}
