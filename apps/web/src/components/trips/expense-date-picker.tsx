"use client";

import { RiCalendarLine } from "@remixicon/react";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { formatTripDate } from "@/lib/trip-values";

function toLocalDate(date: Date) {
	const localDate = new Date(
		date.getTime() - date.getTimezoneOffset() * 60_000
	);
	return localDate.toISOString().slice(0, 10);
}

function localToday() {
	return toLocalDate(new Date());
}

function serverToday() {
	return "";
}

function subscribe() {
	return () => undefined;
}

export function ExpenseDatePicker({ id }: { id: string }) {
	const today = useSyncExternalStore(subscribe, localToday, serverToday);
	const [date, setDate] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const value = date ?? today;
	const selected = value ? new Date(`${value}T12:00:00`) : undefined;

	const chooseDate = useCallback((next: Date) => {
		setDate(toLocalDate(next));
		setOpen(false);
	}, []);

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<Input hidden name="spentOn" type="hidden" value={value} />
			<PopoverTrigger
				id={id}
				render={
					<Button
						className="h-11 w-full justify-start font-normal tabular-nums"
						variant="outline"
					/>
				}
			>
				<RiCalendarLine aria-hidden="true" data-icon="inline-start" />
				{value ? formatTripDate(value) : "Choose date"}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					autoFocus
					defaultMonth={selected}
					mode="single"
					onSelect={chooseDate}
					required
					selected={selected}
				/>
			</PopoverContent>
		</Popover>
	);
}
