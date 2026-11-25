"use client";

import { RiAddLine } from "@remixicon/react";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@tripo/ui/components/field";
import Link from "next/link";
import { type ChangeEvent, useCallback, useState } from "react";

import { addExpense } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type CategoryIconName,
	ExpenseCategoryIcon,
} from "./expense-category-icon";
import { ExpenseDatePicker } from "./expense-date-picker";
import { type ExpenseMember, ExpenseSplitFields } from "./expense-split-fields";
import { useTripForm } from "./use-trip-form";

interface Category {
	icon: CategoryIconName;
	id: string;
	name: string;
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
	const payers = members.map(({ id, name }) => ({ label: name, value: id }));

	const changeAmount = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setAmount(event.currentTarget.value);
	}, []);

	const changeCategory = useCallback((value: unknown) => {
		if (typeof value === "string") {
			setCategory(value);
		}
	}, []);

	return (
		<form className="grid gap-6" onSubmit={submit}>
			<FieldGroup className="gap-4">
				<Field>
					<FieldLabel htmlFor="expense-title">Title</FieldLabel>
					<Input
						className="h-11"
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
							className="h-11 tabular-nums"
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
						<ExpenseDatePicker id="expense-date" />
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="expense-payer">Paid by</FieldLabel>
						<Select
							defaultValue={defaultPayer}
							items={payers}
							name="paidBy"
							required
						>
							<SelectTrigger
								className="w-full data-[size=default]:h-11"
								id="expense-payer"
							>
								<SelectValue placeholder="Select payer" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{payers.map(({ label, value }) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="expense-location">
							Place <span className="text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Input
							className="h-11"
							id="expense-location"
							maxLength={120}
							name="location"
						/>
					</Field>
				</div>
				<fieldset className="min-w-0">
					<legend
						className="mb-2 font-medium text-sm"
						id="expense-category-label"
					>
						Category
					</legend>
					<RadioGroup
						aria-labelledby="expense-category-label"
						className="flex flex-wrap gap-2"
						name="category"
						onValueChange={changeCategory}
						value={category}
					>
						{categories.map(({ id, icon, name }) => (
							<FieldLabel
								className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 text-sm hover:border-primary/60 data-[selected=true]:border-primary data-[selected=true]:bg-accent/40"
								data-selected={category === id}
								htmlFor={`expense-category-${id}`}
								key={id}
							>
								<RadioGroupItem
									aria-label={name}
									id={`expense-category-${id}`}
									value={id}
								/>
								<ExpenseCategoryIcon
									className="size-4 shrink-0 text-primary"
									icon={icon}
								/>
								<span className="wrap-anywhere">{name}</span>
							</FieldLabel>
						))}
						<FieldLabel
							className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border border-dashed px-3 text-primary text-sm hover:border-primary/60 data-[selected=true]:border-primary data-[selected=true]:bg-accent/40"
							data-selected={category === "new"}
							htmlFor="expense-category-new"
						>
							<RadioGroupItem
								aria-label="Add category"
								id="expense-category-new"
								value="new"
							/>
							<RiAddLine aria-hidden="true" className="size-4" />
							Add category
						</FieldLabel>
					</RadioGroup>
					{category === "new" ? (
						<Field className="mt-3 max-w-xs">
							<FieldLabel htmlFor="category-name">Category name</FieldLabel>
							<Input
								className="h-11"
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
				<Button className="h-11 px-4" disabled={pending} type="submit">
					{pending ? "Saving…" : "Save expense"}
				</Button>
				<Button
					className="h-11 px-4"
					nativeButton={false}
					render={<Link href={`/dashboard/trips/${tripId}`} />}
					variant="outline"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
