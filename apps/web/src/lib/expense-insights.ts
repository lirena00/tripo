import type { getTripExpenses } from "./trip-queries";

type Expenses = Awaited<ReturnType<typeof getTripExpenses>>;

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;
const MAX_BARS = 12;

function getSpendingTimeline(dailyTotals: Map<number, number>) {
	const days = Array.from(dailyTotals.keys()).sort(
		(left, right) => left - right
	);
	const [firstDay] = days;
	const lastDay = days.at(-1);
	if (firstDay === undefined || lastDay === undefined) {
		return { daysPerBar: 1, periods: [] };
	}

	const dayCount = lastDay - firstDay + 1;
	const daysPerBar =
		dayCount <= MAX_BARS
			? 1
			: Math.ceil(dayCount / (MAX_BARS * DAYS_PER_WEEK)) * DAYS_PER_WEEK;
	const periodTotals = new Map<number, number>();
	for (const [day, amount] of dailyTotals) {
		const index = Math.floor((day - firstDay) / daysPerBar);
		periodTotals.set(index, (periodTotals.get(index) ?? 0) + amount);
	}

	const periods = Array.from(
		{ length: Math.ceil(dayCount / daysPerBar) },
		(_, index) => {
			const first = firstDay + index * daysPerBar;
			const last = Math.min(first + daysPerBar - 1, lastDay);
			return {
				amount: periodTotals.get(index) ?? 0,
				end: last * DAY_MS,
				start: first * DAY_MS,
			};
		}
	);
	return { daysPerBar, periods };
}

export function getExpenseInsights(expenses: Expenses) {
	const categories = new Map<string, number>();
	const payers = new Map<
		string,
		{ amount: number; count: number; name: string }
	>();
	const dailyTotals = new Map<number, number>();

	for (const { amountPaise, category, payer, payerId, spentOn } of expenses) {
		categories.set(category, (categories.get(category) ?? 0) + amountPaise);
		const previous = payers.get(payerId);
		payers.set(payerId, {
			amount: (previous?.amount ?? 0) + amountPaise,
			count: (previous?.count ?? 0) + 1,
			name: payer,
		});
		const day = Date.parse(spentOn) / DAY_MS;
		dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + amountPaise);
	}

	return {
		categories: Array.from(categories).sort(
			(left, right) => right[1] - left[1]
		),
		payers: Array.from(payers).sort(
			(left, right) => right[1].amount - left[1].amount
		),
		timeline: getSpendingTimeline(dailyTotals),
	};
}
