"use client";

import { Combobox } from "@base-ui/react/combobox";
import { RiCloseLine, RiUserAddLine } from "@remixicon/react";
import { Field, FieldError, FieldLabel } from "@tripo/ui/components/field";
import { useCallback, useEffect, useState } from "react";

import { inviteMembers } from "@/app/dashboard/actions";
import { PersonAvatar } from "@/components/person-avatar";
import { useTripForm } from "./use-trip-form";

interface Person {
	id: string;
	name: string;
}

const MAX_INVITEES = 20;
const SEARCH_DELAY = 200;

function samePerson(left: Person, right: Person) {
	return left.id === right.id;
}

function personName(person: Person) {
	return person.name;
}

function personId(person: Person) {
	return person.id;
}

function usePeopleSearch(tripId: string, query: string) {
	const [result, setResult] = useState<{
		error: boolean;
		people: Person[];
		query: string;
	}>();
	useEffect(() => {
		if (query.length < 2) {
			return;
		}
		const controller = new AbortController();
		async function search() {
			try {
				const response = await fetch(
					`/api/trips/${tripId}/invitees?q=${encodeURIComponent(query)}`,
					{ signal: controller.signal }
				);
				if (!response.ok) {
					throw new Error("Search failed.");
				}
				const people: Person[] = await response.json();
				setResult({ error: false, people, query });
			} catch {
				if (!controller.signal.aborted) {
					setResult({ error: true, people: [], query });
				}
			}
		}
		const timer = window.setTimeout(search, SEARCH_DELAY);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [query, tripId]);
	return result?.query === query ? result : undefined;
}

export function MemberInviteForm({ tripId }: { tripId: string }) {
	const [input, setInput] = useState("");
	const [selected, setSelected] = useState<Person[]>([]);
	const [sent, setSent] = useState(false);
	const query = input.trim();
	const result = usePeopleSearch(tripId, query);
	const people =
		result?.people.filter(
			(person) => !selected.some((item) => samePerson(item, person))
		) ?? [];

	const sendInvites = useCallback(
		async (previous: string, data: FormData) => {
			const error = await inviteMembers(tripId, previous, data);
			if (!error) {
				setSelected([]);
				setInput("");
				setSent(true);
			}
			return error;
		},
		[tripId]
	);
	const { error, pending, submit } = useTripForm(sendInvites);

	const selectPerson = useCallback((person: Person | null) => {
		if (!person) {
			return;
		}
		setSelected((current) =>
			current.length >= MAX_INVITEES ||
			current.some((item) => samePerson(item, person))
				? current
				: [...current, person]
		);
		setInput("");
		setSent(false);
	}, []);

	const removePerson = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			const id = event.currentTarget.value;
			setSelected((current) => current.filter((person) => person.id !== id));
		},
		[]
	);

	let emptyText = "No matching people available.";
	if (result?.error) {
		emptyText = "Search is unavailable. Try again.";
	} else if (!result) {
		emptyText = "Searching…";
	}

	return (
		<form className="grid max-w-lg gap-3" onSubmit={submit}>
			<Field>
				<FieldLabel htmlFor="member-search">Invite people</FieldLabel>
				<Combobox.Root
					autoHighlight
					filter={null}
					inputValue={input}
					isItemEqualToValue={samePerson}
					items={people}
					itemToStringLabel={personName}
					itemToStringValue={personId}
					onInputValueChange={setInput}
					onValueChange={selectPerson}
					value={null}
				>
					<Combobox.Input
						className="trip-control"
						disabled={pending || selected.length >= MAX_INVITEES}
						id="member-search"
						maxLength={254}
						placeholder="Search by name or exact email"
					/>
					{query.length >= 2 ? (
						<Combobox.Portal>
							<Combobox.Positioner align="start" sideOffset={5}>
								<Combobox.Popup className="w-(--anchor-width) overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
									<Combobox.Empty className="px-2 py-2 text-muted-foreground text-sm">
										{emptyText}
									</Combobox.Empty>
									<Combobox.List className="max-h-64 overflow-y-auto">
										{people.map((person) => (
											<Combobox.Item
												className="flex min-h-10 cursor-default items-center gap-2 rounded-md px-2 text-sm data-highlighted:bg-accent"
												key={person.id}
												value={person}
											>
												<PersonAvatar id={person.id} />
												<span className="wrap-anywhere">{person.name}</span>
											</Combobox.Item>
										))}
									</Combobox.List>
								</Combobox.Popup>
							</Combobox.Positioner>
						</Combobox.Portal>
					) : null}
				</Combobox.Root>
			</Field>
			{selected.length ? (
				<ul aria-label="Selected people" className="flex flex-wrap gap-2">
					{selected.map(({ id, name }) => (
						<li
							className="flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card py-0.5 pr-1 pl-1 text-sm"
							key={id}
						>
							<input name="invitee" type="hidden" value={id} />
							<PersonAvatar id={id} />
							<span className="truncate">{name}</span>
							<button
								aria-label={`Remove ${name}`}
								className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted"
								disabled={pending}
								onClick={removePerson}
								type="button"
								value={id}
							>
								<RiCloseLine aria-hidden="true" className="size-4" />
							</button>
						</li>
					))}
				</ul>
			) : null}
			<div className="flex flex-wrap items-center gap-3">
				<button
					className="site-button site-button--small"
					disabled={pending || !selected.length}
					type="submit"
				>
					<RiUserAddLine aria-hidden="true" className="size-4" />
					{pending ? "Sending…" : "Send invitations"}
				</button>
				{sent ? (
					<output className="text-primary text-sm">Invitations sent.</output>
				) : null}
			</div>
			{error ? <FieldError>{error}</FieldError> : null}
		</form>
	);
}
