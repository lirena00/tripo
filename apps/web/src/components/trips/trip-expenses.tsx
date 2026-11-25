import { RiArrowDownSLine, RiReceiptLine } from "@remixicon/react";

import type { getTripExpenses } from "@/lib/trip-queries";
import { SPLIT_METHODS } from "@/lib/trip-splits";
import { formatMoney, formatTripDate } from "@/lib/trip-values";
import { ExpenseCategoryIcon } from "./expense-category-icon";
import { ExpenseInsights } from "./expense-insights";

type Expenses = Awaited<ReturnType<typeof getTripExpenses>>;

export function TripExpenses({
	currency,
	expenses,
}: {
	currency: string;
	expenses: Expenses;
}) {
	if (!expenses.length) {
		return (
			<div className="flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-6">
				<span className="feature-dither grid size-10 shrink-0 place-items-center rounded-lg text-primary">
					<RiReceiptLine aria-hidden="true" className="size-5" />
				</span>
				<div>
					<h2 className="font-medium">No expenses yet</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Add an expense to record who paid and how it was split.
					</p>
				</div>
			</div>
		);
	}
	const total = expenses.reduce((sum, item) => sum + item.amountPaise, 0);
	return (
		<section aria-labelledby="expenses-heading">
			<div className="mb-3 flex items-baseline justify-between gap-4">
				<h2 className="font-medium" id="expenses-heading">
					Expenses
				</h2>
				<p className="text-muted-foreground text-sm">
					Total{" "}
					<strong className="ml-1 font-semibold text-foreground tabular-nums">
						{formatMoney(total, currency)}
					</strong>
				</p>
			</div>
			<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
				{expenses.map((item) => (
					<li key={item.id}>
						<details className="group">
							<summary className="grid min-h-19 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 outline-none hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 sm:px-4 [&::-webkit-details-marker]:hidden">
								<span className="grid size-10 place-items-center rounded-lg bg-accent/60 text-primary">
									<ExpenseCategoryIcon className="size-5" icon={item.icon} />
								</span>
								<span className="grid min-w-0 gap-0.5">
									<span className="wrap-anywhere font-medium text-sm">
										{item.title}
									</span>
									<span className="wrap-anywhere text-muted-foreground text-xs/5">
										{item.category} · Paid by {item.payer} ·{" "}
										<time dateTime={item.spentOn}>
											{formatTripDate(item.spentOn)}
										</time>
									</span>
								</span>
								<span className="flex items-center gap-1 text-right sm:gap-2">
									<span className="font-semibold text-sm tabular-nums">
										{formatMoney(item.amountPaise, currency)}
									</span>
									<RiArrowDownSLine
										aria-hidden="true"
										className="size-4 shrink-0 text-muted-foreground group-open:rotate-180"
									/>
								</span>
							</summary>
							<div className="mx-3 border-border border-t px-1 py-3 sm:mx-4">
								{item.location ? (
									<p className="wrap-anywhere pb-2 text-muted-foreground text-sm">
										Place: {item.location}
									</p>
								) : null}
								<p className="mb-2 text-muted-foreground text-sm">
									{
										SPLIT_METHODS.find(({ value }) => value === item.splitType)
											?.label
									}{" "}
									split
								</p>
								<ul className="grid gap-1.5">
									{item.shares.map(({ memberId, name, sharePaise }) => (
										<li
											className="flex justify-between gap-3 text-sm"
											key={memberId}
										>
											<span className="wrap-anywhere">{name}</span>
											<span className="shrink-0 tabular-nums">
												{formatMoney(sharePaise, currency)}
											</span>
										</li>
									))}
								</ul>
							</div>
						</details>
					</li>
				))}
			</ul>
			<ExpenseInsights currency={currency} expenses={expenses} />
		</section>
	);
}
