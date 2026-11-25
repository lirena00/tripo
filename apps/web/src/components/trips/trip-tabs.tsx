"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useCallback } from "react";

import { TabItem, TabPanel, Tabs, TabsList } from "@/components/ui/tabs";

const tabs = [
	{ label: "Expenses", value: "expenses" },
	{ label: "Members", value: "members" },
	{ label: "Settle up", value: "settle" },
	{ label: "Activity", value: "activity" },
] as const;

type TripView = (typeof tabs)[number]["value"];

export function TripTabs({
	children,
	selected,
	tripId,
}: {
	children: ReactNode;
	selected: TripView;
	tripId: string;
}) {
	const router = useRouter();
	const changeTab = useCallback(
		(value: string) => {
			if (value === selected || !tabs.some((item) => item.value === value)) {
				return;
			}
			const tripHref = `/dashboard/trips/${tripId}` as const;
			router.push(
				value === "expenses" ? tripHref : `${tripHref}?view=${value}`,
				{ scroll: false }
			);
		},
		[router, selected, tripId]
	);

	return (
		<Tabs onValueChange={changeTab} value={selected}>
			<TabsList aria-label="Trip sections" className="mt-6 mb-6 max-w-full">
				{tabs.map(({ label, value }) => (
					<TabItem key={value} label={label} value={value} />
				))}
			</TabsList>
			{tabs.map(({ value }) => (
				<TabPanel key={value} value={value}>
					{value === selected ? children : null}
				</TabPanel>
			))}
		</Tabs>
	);
}

export type { TripView };
