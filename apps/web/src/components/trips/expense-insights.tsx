import { RiArrowDownSLine } from "@remixicon/react";

import type { getTripExpenses } from "@/lib/trip-queries";
import { formatMoney } from "@/lib/trip-values";

type Expenses = Awaited<ReturnType<typeof getTripExpenses>>;

export function ExpenseInsights({
	currency,
	expenses,
}: {
	currency: string;
	expenses: Expenses;
}) {
	const categories = new Map<string, number>();
	const payers = new Map<string, { count: number; name: string }>();
	for (const { amountPaise, category, payer, payerId } of expenses) {
		categories.set(category, (categories.get(category) ?? 0) + amountPaise);
		payers.set(payerId, {
			count: (payers.get(payerId)?.count ?? 0) + 1,
			name: payer,
		});
	}
	const spending = Array.from(categories).sort(
		(left, right) => right[1] - left[1]
	);
	const payerCounts = Array.from(payers).sort(
		(left, right) => right[1].count - left[1].count
	);
	return (
		<details className="group mt-5 rounded-xl border border-border bg-card">
			<summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
				Spending insights
				<RiArrowDownSLine
					aria-hidden="true"
					className="size-4 text-muted-foreground group-open:rotate-180"
				/>
			</summary>
			<div className="grid gap-5 border-border border-t px-4 py-4 sm:grid-cols-2">
				<div>
					<h3 className="mb-2 font-medium text-sm">Spent by category</h3>
					<ul className="grid gap-2 text-sm">
						{spending.map(([category, amount]) => (
							<li className="flex justify-between gap-3" key={category}>
								<span className="wrap-anywhere">{category}</span>
								<span className="shrink-0 tabular-nums">
									{formatMoney(amount, currency)}
								</span>
							</li>
						))}
					</ul>
				</div>
				<div>
					<h3 className="mb-2 font-medium text-sm">Who paid most often</h3>
					<ul className="grid gap-2 text-sm">
						{payerCounts.map(([id, { count, name }]) => (
							<li className="flex justify-between gap-3" key={id}>
								<span className="wrap-anywhere">{name}</span>
								<span className="shrink-0 tabular-nums">
									{count} {count === 1 ? "expense" : "expenses"}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</details>
	);
}
