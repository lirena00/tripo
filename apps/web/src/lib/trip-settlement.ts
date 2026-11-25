export interface MemberBalance {
	memberId: string;
	name: string;
	netPaise: number;
}

interface Payment {
	amountPaise: number;
	from: string;
	to: string;
}

const EXACT_MEMBER_LIMIT = 18;

// Adapted from feature/backend-algo's debtor-to-creditor matcher.
function matchPayments(balances: readonly MemberBalance[]): Payment[] {
	const creditors = balances
		.filter(({ netPaise }) => netPaise > 0)
		.map(({ memberId, netPaise }) => ({ memberId, remaining: netPaise }))
		.sort((left, right) => right.remaining - left.remaining);
	const debtors = balances
		.filter(({ netPaise }) => netPaise < 0)
		.map(({ memberId, netPaise }) => ({ memberId, remaining: -netPaise }))
		.sort((left, right) => right.remaining - left.remaining);
	const payments: Payment[] = [];
	let creditorIndex = 0;
	let debtorIndex = 0;
	for (;;) {
		const creditor = creditors[creditorIndex];
		const debtor = debtors[debtorIndex];
		if (!(creditor && debtor)) {
			return payments;
		}
		const amountPaise = Math.min(creditor.remaining, debtor.remaining);
		payments.push({
			amountPaise,
			from: debtor.memberId,
			to: creditor.memberId,
		});
		creditor.remaining -= amountPaise;
		debtor.remaining -= amountPaise;
		if (creditor.remaining === 0) {
			creditorIndex += 1;
		}
		if (debtor.remaining === 0) {
			debtorIndex += 1;
		}
	}
}

function minimumPaymentGroups(balances: readonly MemberBalance[]) {
	const subsetCount = 2 ** balances.length;
	const sums = new Float64Array(subsetCount);
	const groupCounts = new Uint8Array(subsetCount);
	const removals = new Uint8Array(subsetCount);
	const members = balances.map((member, index) => ({
		member,
		offset: 2 ** index,
	}));

	// Removing members one at a time maximizes the number of zero-sum prefixes.
	// Each prefix boundary saves one transfer by creating an independent group.
	for (let mask = 1; mask < subsetCount; mask += 1) {
		let sum: number | undefined;
		let bestCount = -1;
		for (const [index, { member, offset }] of members.entries()) {
			if (Math.floor(mask / offset) % 2 === 0) {
				continue;
			}
			const previous = mask - offset;
			sum ??= (sums[previous] ?? 0) + member.netPaise;
			const count = groupCounts[previous] ?? 0;
			if (count > bestCount) {
				bestCount = count;
				removals[mask] = index;
			}
		}
		sums[mask] = sum ?? 0;
		groupCounts[mask] = bestCount + Number(sum === 0);
	}

	const groups: MemberBalance[][] = [];
	let group: MemberBalance[] = [];
	for (let mask = subsetCount - 1; mask > 0; ) {
		const match = members[removals[mask] ?? 0];
		if (!match) {
			throw new Error("The settlement plan could not be reconstructed.");
		}
		group.push(match.member);
		mask -= match.offset;
		if (sums[mask] === 0) {
			groups.push(group);
			group = [];
		}
	}
	return groups;
}

export function getSettlementPlan(balances: readonly MemberBalance[]) {
	if (balances.some(({ netPaise }) => !Number.isSafeInteger(netPaise))) {
		throw new Error("Trip balances exceed the supported precision.");
	}
	const zero = BigInt(0);
	const total = balances.reduce(
		(sum, { netPaise }) => sum + BigInt(netPaise),
		zero
	);
	if (total !== zero) {
		throw new Error("Trip balances must sum to zero.");
	}
	const outstandingPaise = balances.reduce(
		(sum, { netPaise }) => sum + Math.max(0, netPaise),
		0
	);
	if (!Number.isSafeInteger(outstandingPaise)) {
		throw new Error("Trip balances exceed the supported precision.");
	}
	const unsettled = balances.filter(({ netPaise }) => netPaise !== 0);
	const minimumGuaranteed = unsettled.length <= EXACT_MEMBER_LIMIT;
	const payments = minimumGuaranteed
		? minimumPaymentGroups(unsettled).flatMap(matchPayments)
		: matchPayments(unsettled);

	return {
		balances,
		minimumGuaranteed,
		outstandingPaise,
		paymentCount: payments.length,
		payments,
	};
}
