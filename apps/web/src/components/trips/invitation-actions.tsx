"use client";

import { FieldError } from "@tripo/ui/components/field";

import { respondToInvitation } from "@/app/dashboard/actions";
import { useTripForm } from "./use-trip-form";

export function InvitationActions({ id, owner = false }: { id: string; owner?: boolean }) {
	const { error, pending, submit } = useTripForm(respondToInvitation.bind(null, id));
	return (
		<form aria-busy={pending} className="grid gap-2" onSubmit={submit}>
			<div className="flex flex-wrap gap-2">
				{owner ? (
					<button className="site-button site-button--secondary site-button--small" disabled={pending} name="response" type="submit" value="revoke">Revoke</button>
				) : (
					<>
						<button className="site-button site-button--small" disabled={pending} name="response" type="submit" value="accept">Accept</button>
						<button className="site-button site-button--secondary site-button--small" disabled={pending} name="response" type="submit" value="decline">Decline</button>
					</>
				)}
			</div>
			{error ? <FieldError>{error}</FieldError> : null}
		</form>
	);
}
