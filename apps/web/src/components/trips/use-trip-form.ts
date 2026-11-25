"use client";

import { startTransition, type SubmitEvent, useActionState } from "react";

type TripAction = (previous: string, data: FormData) => Promise<string>;

export function useTripForm(action: TripAction) {
	const [error, dispatch, pending] = useActionState(action, "");

	function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) {
			return;
		}
		const data = new FormData(event.currentTarget, event.nativeEvent.submitter);
		startTransition(() => dispatch(data));
	}

	return { error, pending, submit };
}
