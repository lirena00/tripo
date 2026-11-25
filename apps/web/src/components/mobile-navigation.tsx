"use client";

import { Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

export default function MobileNavigation({
	children,
}: {
	children: ReactNode;
}) {
	const detailsRef = useRef<HTMLDetailsElement>(null);
	const toggleRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const details = detailsRef.current;
		if (!details) {
			return;
		}

		const followLink = (event: MouseEvent) => {
			if (
				details.open &&
				event.target instanceof Element &&
				(!details.contains(event.target) || event.target.closest("a"))
			) {
				details.open = false;
			}
		};

		const dismiss = (event: KeyboardEvent) => {
			if (event.key === "Escape" && details.open) {
				details.open = false;
				toggleRef.current?.focus();
			}
		};

		document.addEventListener("click", followLink, true);
		details.addEventListener("keydown", dismiss);
		return () => {
			document.removeEventListener("click", followLink, true);
			details.removeEventListener("keydown", dismiss);
		};
	}, []);

	return (
		<details className="group md:hidden" ref={detailsRef}>
			<summary
				aria-label="Site menu"
				className="grid size-11 cursor-pointer list-none place-items-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
				ref={toggleRef}
			>
				<Menu aria-hidden="true" className="size-5 group-open:hidden" />
				<X aria-hidden="true" className="hidden size-5 group-open:block" />
			</summary>
			<nav
				aria-label="Mobile navigation"
				className="absolute inset-x-[-1px] top-[calc(100%-8px)] grid gap-2 rounded-b-xl border border-border bg-background px-5 pt-3 pb-5"
			>
				{children}
			</nav>
		</details>
	);
}
