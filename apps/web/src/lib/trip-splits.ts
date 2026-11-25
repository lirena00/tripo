export const SPLIT_METHODS = [
	{ value: "equal", label: "Equal" },
	{ value: "percent", label: "Percentage" },
	{ value: "exact", label: "Custom amounts" },
	{ value: "shares", label: "Shares" },
] as const;

export type SplitType = (typeof SPLIT_METHODS)[number]["value"];

interface SplitInput {
	splitType: SplitType;
	splitAmong: string[];
	splitValues?: Record<string, number>;
}

interface ComputedShare {
	memberId: string;
	sharePaise: number;
}

// Adapted from feature/backend-algo. Keep money in integer minor units.
export function computeShares(
	amountPaise: number,
	input: SplitInput,
	memberIds: readonly string[]
): ComputedShare[] {
	if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
		throw new Error("Enter a positive expense amount.");
	}
	const participants = input.splitAmong.toSorted();
	if (participants.length === 0) {
		throw new Error("Select at least one person to split with.");
	}
	const validMembers = new Set(memberIds);
	if (
		new Set(participants).size !== participants.length ||
		participants.some((id) => !validMembers.has(id))
	) {
		throw new Error("Select distinct members of this trip.");
	}

	if (input.splitType === "equal") {
		const baseShare = Math.floor(amountPaise / participants.length);
		const remainder = amountPaise % participants.length;
		return participants.map((memberId, index) => ({
			memberId,
			sharePaise: baseShare + Number(index < remainder),
		}));
	}

	const values = input.splitValues ?? {};
	if (Object.keys(values).length !== participants.length) {
		throw new Error("Enter a value for every person in the split.");
	}
	const entries = participants.map((memberId) => {
		const value = values[memberId];
		if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
			throw new Error("Enter a valid split value for each person.");
		}
		return { memberId, value };
	});
	const total = entries.reduce((sum, entry) => sum + entry.value, 0);
	if (input.splitType === "exact") {
		if (total !== amountPaise) {
			throw new Error("Custom amounts must add up to the expense total.");
		}
		return entries.map(({ memberId, value }) => ({ memberId, sharePaise: value }));
	}
	if (input.splitType === "percent" && total !== 10_000) {
		throw new Error("Percentages must add up to 100%.");
	}
	if (!Number.isSafeInteger(total) || total <= 0) {
		throw new Error("Enter at least one share.");
	}

	const denominator = BigInt(total);
	const shares = entries.map(({ memberId, value }) => {
		const weightedAmount = BigInt(amountPaise) * BigInt(value);
		return {
			memberId,
			sharePaise: Number(weightedAmount / denominator),
			remainder: Number(weightedAmount % denominator),
		};
	});
	const remaining = amountPaise - shares.reduce((sum, share) => sum + share.sharePaise, 0);
	// Stable sort keeps the branch's member-ID tie breaker.
	const ranked = shares.toSorted((left, right) => right.remainder - left.remainder);
	for (const share of ranked.slice(0, remaining)) {
		share.sharePaise += 1;
	}
	return shares.map(({ memberId, sharePaise }) => ({ memberId, sharePaise }));
}
