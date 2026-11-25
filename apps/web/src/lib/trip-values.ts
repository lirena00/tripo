export const DEFAULT_CATEGORIES = [
	{ icon: "travel", name: "Travel" },
	{ icon: "hotel", name: "Hotels" },
	{ icon: "food", name: "Food" },
	{ icon: "entertainment", name: "Entertainment" },
	{ icon: "other", name: "Other" },
] as const;

export const TRIP_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

const DECIMAL = /^\d{1,9}(?:\.\d{1,2})?$/;
const WHOLE_SHARES = /^\d{1,6}$/;

export function parseMinorUnits(value: string): number | undefined {
	if (!DECIMAL.test(value)) {
		return undefined;
	}
	const [whole, fraction = ""] = value.split(".");
	return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function parseWholeShares(value: string): number | undefined {
	return WHOLE_SHARES.test(value) ? Number(value) : undefined;
}

export function formatMoney(amountPaise: number, currency: string) {
	return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
		currency,
		style: "currency",
	}).format(amountPaise / 100);
}

export function formatTripDate(isoDate: string) {
	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeZone: "UTC",
	}).format(new Date(isoDate));
}
