"use client";

import { Field, FieldError, FieldGroup, FieldLabel } from "@tripo/ui/components/field";
import { Input } from "@tripo/ui/components/input";

import { createTrip } from "@/app/dashboard/actions";
import { TRIP_CURRENCIES } from "@/lib/trip-values";
import { useTripForm } from "./use-trip-form";

export function TripForm() {
	const { error, pending, submit } = useTripForm(createTrip);
	return (
		<form className="grid gap-6" onSubmit={submit}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="trip-name">Trip name</FieldLabel>
					<Input className="trip-control" id="trip-name" maxLength={100} name="name" placeholder="Goa weekend" required />
				</Field>
				<Field>
					<FieldLabel htmlFor="destination">Destination <span className="text-muted-foreground">(optional)</span></FieldLabel>
					<Input className="trip-control" id="destination" maxLength={100} name="destination" />
				</Field>
				<Field>
					<FieldLabel htmlFor="currency">Currency</FieldLabel>
					<select className="trip-control" defaultValue="INR" id="currency" name="currency">
						{TRIP_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
					</select>
				</Field>
			</FieldGroup>
			{error ? <FieldError>{error}</FieldError> : null}
			<button className="site-button justify-self-start" disabled={pending} type="submit">{pending ? "Creating…" : "Create trip"}</button>
		</form>
	);
}
