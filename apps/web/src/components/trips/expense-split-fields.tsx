"use client";

import { type ChangeEvent, useCallback, useState } from "react";

import { PersonAvatar } from "@/components/person-avatar";
import {
	computeShares,
	SPLIT_METHODS,
	type SplitType,
} from "@/lib/trip-splits";
import {
	formatMoney,
	parseMinorUnits,
	parseWholeShares,
} from "@/lib/trip-values";

export interface ExpenseMember {
	id: string;
	name: string;
	userId: string;
}

const inputLabels = {
	exact: "Amount",
	percent: "Percent",
	shares: "Shares",
} as const;

function getPreview(
	amount: string,
	method: SplitType,
	participants: string[],
	values: Record<string, string>,
	members: readonly ExpenseMember[]
) {
	const amountPaise = parseMinorUnits(amount.trim());
	if (!amountPaise || participants.length === 0) {
		return new Map<string, number>();
	}

	const readValue = method === "shares" ? parseWholeShares : parseMinorUnits;
	const splitValues =
		method === "equal"
			? undefined
			: Object.fromEntries(
					participants.map((id) => [
						id,
						readValue(values[id]?.trim() ?? "") ?? Number.NaN,
					])
				);
	try {
		const result = computeShares(
			amountPaise,
			{ splitAmong: participants, splitType: method, splitValues },
			members.map(({ id }) => id)
		);
		return new Map(
			result.map(({ memberId, sharePaise }) => [memberId, sharePaise])
		);
	} catch {
		return new Map<string, number>();
	}
}

export function ExpenseSplitFields({
	amount,
	currency,
	members,
}: {
	amount: string;
	currency: string;
	members: readonly ExpenseMember[];
}) {
	const [method, setMethod] = useState<SplitType>("equal");
	const [participants, setParticipants] = useState(() =>
		members.map(({ id }) => id)
	);
	const [values, setValues] = useState<Record<string, string>>({});
	const preview = getPreview(amount, method, participants, values, members);
	const valueLabel = method === "equal" ? null : inputLabels[method];

	const changeMethod = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const { value } = event.currentTarget;
		const option = SPLIT_METHODS.find((item) => item.value === value);
		if (option) {
			setMethod(option.value);
			setValues({});
		}
	}, []);

	const changeParticipant = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const { checked, value } = event.currentTarget;
			setParticipants((current) =>
				checked ? [...current, value] : current.filter((item) => item !== value)
			);
		},
		[]
	);

	const changeShare = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.currentTarget;
		const memberId = name.slice("share-".length);
		setValues((current) => ({ ...current, [memberId]: value }));
	}, []);

	return (
		<div className="grid gap-4 border-border border-t pt-5">
			<fieldset className="grid min-w-0 gap-3">
				<legend className="mb-3 font-medium">Split expense</legend>
				<div className="flex flex-wrap gap-2">
					{SPLIT_METHODS.map(({ value, label }) => (
						<label
							className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm hover:border-primary/60 has-checked:border-primary has-checked:bg-accent/40"
							key={value}
						>
							<input
								checked={method === value}
								className="accent-primary"
								name="splitType"
								onChange={changeMethod}
								type="radio"
								value={value}
							/>
							{label}
						</label>
					))}
				</div>
				{method === "shares" ? (
					<p className="text-muted-foreground text-sm">
						Use whole shares, such as 2 and 1 for a two-to-one split.
					</p>
				) : null}
			</fieldset>
			<fieldset className="min-w-0">
				<legend className="mb-1 text-muted-foreground text-sm">
					People in this split
				</legend>
				<div className="divide-y divide-border border-border border-y">
					{members.map(({ id, name, userId }) => {
						const included = participants.includes(id);
						const allocated = preview.get(id);
						return (
							<div
								className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2"
								key={id}
							>
								<label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
									<input
										checked={included}
										className="size-4 shrink-0 accent-primary"
										name="participant"
										onChange={changeParticipant}
										type="checkbox"
										value={id}
									/>
									<PersonAvatar id={userId} />
									<span className="wrap-anywhere">{name}</span>
								</label>
								<div className="flex shrink-0 items-center gap-3">
									{included && valueLabel ? (
										<input
											aria-label={`${valueLabel} for ${name}`}
											className="trip-control h-9 w-23 px-2 text-right tabular-nums"
											inputMode={method === "shares" ? "numeric" : "decimal"}
											maxLength={12}
											name={`share-${id}`}
											onChange={changeShare}
											placeholder={method === "percent" ? "0%" : "0"}
											required
											value={values[id] ?? ""}
										/>
									) : null}
									{allocated === undefined ? null : (
										<span className="text-muted-foreground text-xs tabular-nums">
											{formatMoney(allocated, currency)}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</fieldset>
		</div>
	);
}
