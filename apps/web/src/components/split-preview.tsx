"use client";

import { ArrowUpRight } from "lucide-react";
import { type MouseEvent, useState } from "react";

const exampleTotal = 2400;
const groupSizes = [2, 3, 4] as const;
const formatAmount = new Intl.NumberFormat("en-IN", {
	currency: "INR",
	maximumFractionDigits: 0,
	style: "currency",
});

export default function SplitPreview() {
	const [groupSize, setGroupSize] = useState<(typeof groupSizes)[number]>(3);

	function selectGroupSize(event: MouseEvent<HTMLButtonElement>) {
		const group = groupSizes.find(
			(size) => size === Number(event.currentTarget.value)
		);
		if (group) {
			setGroupSize(group);
		}
	}

	return (
		<div className="mt-6">
			<div className="feature-dither grid min-h-28 place-content-center gap-1 rounded-lg border border-primary/50 border-dashed text-center text-primary">
				<p className="font-heading text-4xl tracking-tight">₹2,400</p>
				<p className="text-xs">Dinner in Goa</p>
			</div>
			<fieldset className="mt-5">
				<legend className="mb-2 text-muted-foreground text-xs">
					Try an equal split
				</legend>
				<div className="flex flex-wrap gap-1.5">
					{groupSizes.map((size) => (
						<button
							aria-pressed={groupSize === size}
							className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 text-xs hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
							key={size}
							onClick={selectGroupSize}
							type="button"
							value={size}
						>
							{size} people
							<ArrowUpRight aria-hidden="true" className="size-3" />
						</button>
					))}
				</div>
			</fieldset>
			<p
				aria-live="polite"
				className="mt-5 rounded-lg bg-muted px-3 py-2.5 text-muted-foreground text-sm"
			>
				<strong className="font-medium text-foreground">
					{formatAmount.format(exampleTotal / groupSize)}
				</strong>{" "}
				per person
			</p>
		</div>
	);
}
