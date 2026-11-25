import type { getTripExpenses } from "./trip-queries";
import { SPLIT_METHODS } from "./trip-splits";

type Expenses = Awaited<ReturnType<typeof getTripExpenses>>;

const FORMULA_PREFIX = /^\s*[=+@＝＋－＠-]|^[\t\r\n]/u;
const FILENAME_SEPARATORS = /[^\p{L}\p{N}]+/gu;
const EDGE_DASHES = /^-|-$/g;
const MAX_FILENAME_LENGTH = 60;

function quoteCsvCell(value: string) {
	// Spreadsheet apps may evaluate formula-like text even in quoted fields.
	const text = FORMULA_PREFIX.test(value) ? `'${value}` : value;
	return `"${text.replaceAll('"', '""')}"`;
}

export function formatExpensesCsv(expenses: Expenses, currency: string) {
	const rows = [
		[
			"Date",
			"Expense",
			"Category",
			"Paid by",
			"Amount",
			"Currency",
			"Location",
			"Split method",
			"Split details",
		],
	];
	for (const item of expenses) {
		const splitMethod = SPLIT_METHODS.find(
			({ value }) => value === item.splitType
		)?.label;
		const shares = item.shares.map(
			({ name, sharePaise }) => `${name}: ${(sharePaise / 100).toFixed(2)}`
		);
		rows.push([
			item.spentOn,
			item.title,
			item.category,
			item.payer,
			(item.amountPaise / 100).toFixed(2),
			currency,
			item.location ?? "",
			splitMethod ?? item.splitType,
			shares.join("; "),
		]);
	}
	return `\uFEFF${rows.map((row) => row.map(quoteCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function getExpensesCsvDisposition(tripName: string) {
	const name = Array.from(tripName.replace(FILENAME_SEPARATORS, "-"))
		.slice(0, MAX_FILENAME_LENGTH)
		.join("")
		.replace(EDGE_DASHES, "");
	const filename = name ? `${name}-expenses.csv` : "trip-expenses.csv";
	return `attachment; filename="trip-expenses.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
