import { RiArrowDownSLine, RiBarChartLine } from "@remixicon/react";

import { getExpenseInsights } from "@/lib/expense-insights";
import { formatMoney } from "@/lib/trip-values";

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeZone: "UTC",
});
const percentFormat = new Intl.NumberFormat("en", {
	maximumFractionDigits: 1,
	style: "percent",
});
const PAYER_COLORS = [
	"var(--primary)",
	"#b18542",
	"#507d96",
	"#b56758",
	"#6b8051",
	"#85709b",
] as const;
const GOLDEN_ANGLE = 137.5;

function SpendingByCategory({
	categories,
	currency,
	total,
}: {
	categories: ReturnType<typeof getExpenseInsights>["categories"];
	currency: string;
	total: number;
}) {
	return (
		<div className="min-w-0">
			<h3 className="mb-4 font-medium text-sm">Spent by category</h3>
			<ul className="grid gap-4">
				{categories.map(([category, amount]) => (
					<li className="grid gap-1.5 text-sm" key={category}>
						<div className="flex items-baseline justify-between gap-3">
							<span className="wrap-anywhere">{category}</span>
							<span className="shrink-0 font-medium tabular-nums">
								{formatMoney(amount, currency)}
							</span>
						</div>
						<div
							aria-hidden="true"
							className="h-2 overflow-hidden rounded-full bg-muted"
						>
							<div
								className="h-full rounded-full bg-primary"
								style={{ width: `${(amount / total) * 100}%` }}
							/>
						</div>
						<span className="text-muted-foreground text-xs tabular-nums">
							{percentFormat.format(amount / total)} of total
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function SpendingByPayer({
	currency,
	payers,
	total,
}: {
	currency: string;
	payers: ReturnType<typeof getExpenseInsights>["payers"];
	total: number;
}) {
	const topPayer = payers[0]?.[1];
	if (!topPayer) {
		return null;
	}
	const topPayerCount = payers.filter(
		([, { amount }]) => amount === topPayer.amount
	).length;
	const tied = topPayerCount > 1;
	const topPayerLabel = tied ? `${topPayerCount} tied` : topPayer.name;
	const slices: string[] = [];
	let paid = 0;
	const legend = payers.map(([id, payer], index) => {
		const color =
			PAYER_COLORS[index] ?? `hsl(${(index * GOLDEN_ANGLE) % 360} 40% 44%)`;
		const start = (paid / total) * 100;
		paid += payer.amount;
		slices.push(`${color} ${start}% ${(paid / total) * 100}%`);
		return { ...payer, color, id };
	});
	return (
		<div className="min-w-0">
			<h3 className="mb-4 font-medium text-sm">Paid by member</h3>
			<div
				className="mx-auto grid aspect-square w-40 place-items-center rounded-full sm:w-44"
				style={{
					backgroundColor: PAYER_COLORS[0],
					backgroundImage: `conic-gradient(${slices.join(", ")})`,
				}}
			>
				<div className="grid aspect-square w-[74%] content-center gap-1 rounded-full bg-card px-4 text-center">
					<span className="text-muted-foreground text-xs">
						{tied ? "Top payers" : "Top payer"}
					</span>
					<span className="truncate font-medium text-sm" title={topPayerLabel}>
						{topPayerLabel}
					</span>
				</div>
			</div>
			<ul className="mt-4 grid gap-3 text-sm">
				{legend.map(({ amount, color, count, id, name }) => (
					<li
						className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2"
						key={id}
					>
						<span
							aria-hidden="true"
							className="mt-1.5 size-2.5 rounded-full"
							style={{ backgroundColor: color }}
						/>
						<span className="grid gap-0.5">
							<span className="wrap-anywhere">{name}</span>
							<span className="text-muted-foreground text-xs">
								{count} {count === 1 ? "expense" : "expenses"}
							</span>
						</span>
						<span className="grid gap-0.5 text-right tabular-nums">
							<span className="font-medium">
								{formatMoney(amount, currency)}
							</span>
							<span className="text-muted-foreground text-xs">
								{percentFormat.format(amount / total)}
							</span>
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function SpendingTimeline({
	currency,
	timeline: { daysPerBar, periods },
}: {
	currency: string;
	timeline: ReturnType<typeof getExpenseInsights>["timeline"];
}) {
	const [first] = periods;
	const last = periods.at(-1);
	if (!(first && last)) {
		return null;
	}
	const peak = Math.max(...periods.map(({ amount }) => amount));
	const axisFormat = new Intl.NumberFormat(
		currency === "INR" ? "en-IN" : "en",
		{
			currency,
			maximumFractionDigits: 2,
			notation: "compact",
			style: "currency",
		}
	);
	const interval = new Intl.NumberFormat("en", {
		style: "unit",
		unit: "day",
		unitDisplay: "long",
	}).format(daysPerBar);
	return (
		<div>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<h3 className="font-medium text-sm">Spending over time</h3>
				<p className="text-muted-foreground text-xs">
					{daysPerBar === 1 ? "Daily totals" : `Totals every ${interval}`}
				</p>
			</div>
			<div
				aria-hidden="true"
				className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2"
			>
				<div className="flex flex-col justify-between text-right text-muted-foreground text-xs tabular-nums">
					<span>{axisFormat.format(peak / 100)}</span>
					<span>{axisFormat.format(0)}</span>
				</div>
				<div className="relative flex h-36 justify-center gap-1 border-border border-y pt-px sm:gap-2">
					<div className="pointer-events-none absolute inset-x-0 top-1/2 border-border border-t border-dashed" />
					{periods.map(({ amount, end, start }) => (
						<div
							className="z-0 flex flex-1 items-end justify-center px-0.5"
							key={start}
							title={`${dateFormat.formatRange(start, end)} · ${formatMoney(amount, currency)}`}
						>
							<div
								className="w-full max-w-14 rounded-t-sm bg-primary"
								style={{ height: `${(amount / peak) * 100}%` }}
							/>
						</div>
					))}
				</div>
				<div className="col-start-2 flex flex-wrap justify-between gap-x-3 text-muted-foreground text-xs">
					<span>{dateFormat.format(first.start)}</span>
					{first.start === last.end ? null : (
						<span>{dateFormat.format(last.end)}</span>
					)}
				</div>
			</div>
			<details className="mt-2.5" suppressHydrationWarning>
				<summary className="w-fit cursor-pointer rounded-sm py-2 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
					View chart data
				</summary>
				<ul className="divide-y divide-border border-border border-t text-sm">
					{periods.map(({ amount, end, start }) => (
						<li className="flex justify-between gap-3 py-2" key={start}>
							<span>{dateFormat.formatRange(start, end)}</span>
							<span className="shrink-0 tabular-nums">
								{formatMoney(amount, currency)}
							</span>
						</li>
					))}
				</ul>
			</details>
		</div>
	);
}

export function ExpenseInsights({
	currency,
	expenses,
	total,
}: {
	currency: string;
	expenses: Parameters<typeof getExpenseInsights>[0];
	total: number;
}) {
	const { categories, payers, timeline } = getExpenseInsights(expenses);
	return (
		<details
			className="group mb-4 overflow-hidden rounded-xl border border-border bg-card"
			suppressHydrationWarning
		>
			<summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-4 font-medium text-sm outline-none hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
				<RiBarChartLine aria-hidden="true" className="size-4 text-primary" />
				Spending insights
				<RiArrowDownSLine
					aria-hidden="true"
					className="ml-auto size-4 text-muted-foreground group-open:rotate-180"
				/>
			</summary>
			<div className="divide-y divide-border border-border border-t">
				<div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2 sm:p-5">
					<SpendingByPayer currency={currency} payers={payers} total={total} />
					<SpendingByCategory
						categories={categories}
						currency={currency}
						total={total}
					/>
				</div>
				<div className="p-4 sm:p-5">
					<SpendingTimeline currency={currency} timeline={timeline} />
				</div>
			</div>
		</details>
	);
}
