"use client";

import { RiAddLine } from "@remixicon/react";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@tripo/ui/components/field";
import { Input } from "@tripo/ui/components/input";
import Link from "next/link";
import { type ChangeEvent, useCallback, useState } from "react";

import { addExpense } from "@/app/dashboard/actions";
import {
	type CategoryIconName,
	ExpenseCategoryIcon,
} from "./expense-category-icon";
import { type ExpenseMember, ExpenseSplitFields } from "./expense-split-fields";
import { useTripForm } from "./use-trip-form";

interface Category {
	icon: CategoryIconName;
	id: string;
	name: string;
}

function setLocalDate(input: HTMLInputElement | null) {
	if (input && !input.value) {
		const date = new Date();
		const localDate = new Date(
			date.getTime() - date.getTimezoneOffset() * 60_000
		);
		input.value = localDate.toISOString().slice(0, 10);
	}
}

export function ExpenseForm({
	categories,
	currency,
	defaultPayer,
	members,
	tripId,
}: {
	categories: readonly Category[];
	currency: string;
	defaultPayer: string;
	members: readonly ExpenseMember[];
	tripId: string;
}) {
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState(
		categories.find(({ icon }) => icon === "other")?.id ?? "new"
	);
	const { error, pending, submit } = useTripForm(addExpense.bind(null, tripId));

	const changeAmount = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setAmount(event.currentTarget.value);
	}, []);

	const changeCategory = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setCategory(event.currentTarget.value);
	}, []);

	return (
		<form className="grid gap-6" onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Field>
					<FieldLabel htmlFor="expense-title">Title</FieldLabel>
					<Input
						className="trip-control"
						id="expense-title"
						maxLength={120}
						name="title"
						placeholder="Dinner at the beach"
						required
					/>
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="expense-amount">
							Amount ({currency})
						</FieldLabel>
						<Input
							className="trip-control tabular-nums"
							id="expense-amount"
							inputMode="decimal"
							maxLength={12}
							name="amount"
							onChange={changeAmount}
							placeholder="0.00"
							required
							value={amount}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="expense-date">Date paid</FieldLabel>
						<Input
							className="trip-control tabular-nums"
							id="expense-date"
							name="spentOn"
							ref={setLocalDate}
							required
							type="date"
						/>
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="expense-payer">Paid by</FieldLabel>
						<select
							className="trip-control"
							defaultValue={defaultPayer}
							id="expense-payer"
							name="paidBy"
							required
						>
							{members.map(({ id, name }) => (
								<option key={id} value={id}>
									{name}
								</option>
							))}
						</select>
					</Field>
					<Field>
						<FieldLabel htmlFor="expense-location">
							Place <span className="text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Input
							className="trip-control"
							id="expense-location"
							maxLength={120}
							name="location"
						/>
					</Field>
				</div>
				<fieldset className="min-w-0">
					<legend className="mb-2 font-medium text-sm">Category</legend>
					<div className="flex flex-wrap gap-2">
						{categories.map(({ id, icon, name }) => (
							<label
								className="relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm hover:border-primary/60 has-checked:border-primary has-checked:bg-accent/40 has-focus-visible:outline-2 has-focus-visible:outline-ring"
								key={id}
							>
								<input
									checked={category === id}
									className="sr-only"
									name="category"
									onChange={changeCategory}
									type="radio"
									value={id}
								/>
								<ExpenseCategoryIcon
									className="size-4 shrink-0 text-primary"
									icon={icon}
								/>
								<span className="wrap-anywhere">{name}</span>
							</label>
						))}
						<label className="relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border border-border border-dashed px-3 text-primary text-sm hover:border-primary/60 has-checked:border-primary has-checked:bg-accent/40 has-focus-visible:outline-2 has-focus-visible:outline-ring">
							<input
								checked={category === "new"}
								className="sr-only"
								name="category"
								onChange={changeCategory}
								type="radio"
								value="new"
							/>
							<RiAddLine aria-hidden="true" className="size-4" />
							Add category
						</label>
					</div>
					{category === "new" ? (
						<Field className="mt-3 max-w-xs">
							<FieldLabel htmlFor="category-name">Category name</FieldLabel>
							<Input
								className="trip-control"
								id="category-name"
								maxLength={50}
								name="categoryName"
								required
							/>
						</Field>
					) : null}
				</fieldset>
			</FieldGroup>
			<ExpenseSplitFields
				amount={amount}
				currency={currency}
				members={members}
			/>
			{error ? <FieldError>{error}</FieldError> : null}
			<div className="flex flex-wrap gap-2">
				<button className="site-button" disabled={pending} type="submit">
					{pending ? "Saving…" : "Save expense"}
				</button>
				<Link
					className="site-button site-button--secondary"
					href={`/dashboard/trips/${tripId}`}
				>
					Cancel
				</Link>
			</div>
		</form>
	);
}
