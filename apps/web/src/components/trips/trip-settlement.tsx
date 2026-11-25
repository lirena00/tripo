import { RiArrowRightLine } from "@remixicon/react";

import type { getTripSettlement } from "@/lib/trip-ledger";
import { formatMoney } from "@/lib/trip-values";

type Settlement = Awaited<ReturnType<typeof getTripSettlement>>;

export function TripSettlement({
	currency,
	plan,
}: {
	currency: string;
	plan: Settlement;
}) {
	const names = new Map(
		plan.balances.map(({ memberId, name }) => [memberId, name])
	);
	return (
		<div className="grid gap-7">
			<section aria-labelledby="payments-heading">
				<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
					<h2 className="font-medium" id="payments-heading">
						Suggested payments
					</h2>
					{plan.paymentCount > 0 ? (
						<p className="text-muted-foreground text-sm">
							{plan.paymentCount}{" "}
							{plan.paymentCount === 1 ? "payment" : "payments"} ·{" "}
							{formatMoney(plan.outstandingPaise, currency)}
						</p>
					) : null}
				</div>
				{plan.payments.length > 0 ? (
					<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
						{plan.payments.map(({ from, to, amountPaise }) => (
							<li
								className="flex min-h-14 items-center justify-between gap-3 px-3 py-3 text-sm sm:px-4"
								key={`${from}:${to}`}
							>
								<span className="flex min-w-0 flex-wrap items-center gap-2">
									<span className="wrap-anywhere font-medium">
										{names.get(from)}
									</span>
									<RiArrowRightLine
										aria-label="pays"
										className="size-4 shrink-0 text-primary"
										role="img"
									/>
									<span className="wrap-anywhere">{names.get(to)}</span>
								</span>
								<strong className="shrink-0 font-semibold tabular-nums">
									{formatMoney(amountPaise, currency)}
								</strong>
							</li>
						))}
					</ul>
				) : (
					<p className="rounded-xl border border-border bg-card p-4 text-muted-foreground text-sm">
						No payments are needed.
					</p>
				)}
				{plan.minimumGuaranteed ? null : (
					<p className="mt-2 text-muted-foreground text-sm">
						This plan clears every balance. The minimum payment count is
						unverified for a group this large.
					</p>
				)}
			</section>
			<section aria-labelledby="balances-heading">
				<h2 className="mb-3 font-medium" id="balances-heading">
					Member balances
				</h2>
				<ul className="divide-y divide-border border-border border-y">
					{plan.balances.map(({ memberId, name, netPaise }) => (
						<li
							className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm"
							key={memberId}
						>
							<span className="wrap-anywhere min-w-0">{name}</span>
							<BalanceAmount currency={currency} netPaise={netPaise} />
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

function BalanceAmount({
	currency,
	netPaise,
}: {
	currency: string;
	netPaise: number;
}) {
	if (netPaise === 0) {
		return <span className="shrink-0 text-muted-foreground">Settled</span>;
	}
	return (
		<span className="shrink-0 text-right text-muted-foreground">
			{netPaise > 0 ? "Gets back" : "Owes"}{" "}
			<strong className="font-medium text-foreground tabular-nums">
				{formatMoney(Math.abs(netPaise), currency)}
			</strong>
		</span>
	);
}
