"use client";

import { Button } from "@tripo/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@tripo/ui/components/field";
import { Input } from "@tripo/ui/components/input";
import { type SubmitEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
	INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect.",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
		"An account already uses this email. Sign in or use a different email.",
};

const RETRY_MESSAGE = "Something went wrong. Please try again.";
const INPUT_CLASS = "h-11 rounded-md px-3 text-base caret-primary md:text-sm";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isSignUp = mode === "sign-up";
	const actionLabel = isSignUp ? "Create account" : "Sign in";
	const pendingLabel = isSignUp ? "Creating account…" : "Signing in…";
	const submitLabel = isSubmitting ? pendingLabel : actionLabel;

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isSubmitting) {
			return;
		}

		const fields = new FormData(event.currentTarget);
		const email = String(fields.get("email") ?? "").trim();
		const password = String(fields.get("password") ?? "");
		const name = String(fields.get("name") ?? "").trim();
		if (isSignUp && !name) {
			setError("Enter your name.");
			return;
		}

		setError("");
		setIsSubmitting(true);
		try {
			const { error: authError } = await (isSignUp
				? authClient.signUp.email({ email, name, password })
				: authClient.signIn.email({ email, password }));

			if (!authError) {
				window.location.replace("/dashboard");
				return;
			}

			setError(
				authError.status === 429
					? "Too many attempts. Wait a moment and try again."
					: (AUTH_ERROR_MESSAGES[authError.code ?? ""] ?? RETRY_MESSAGE)
			);
		} catch {
			setError(RETRY_MESSAGE);
		}
		setIsSubmitting(false);
	}

	return (
		<form className="grid gap-6" method="post" onSubmit={handleSubmit}>
			<FieldGroup className="gap-4">
				{isSignUp ? (
					<Field>
						<FieldLabel className="text-sm" htmlFor="auth-name">
							Name
						</FieldLabel>
						<Input
							autoComplete="name"
							className={INPUT_CLASS}
							id="auth-name"
							maxLength={128}
							name="name"
							required
						/>
					</Field>
				) : null}
				<Field>
					<FieldLabel className="text-sm" htmlFor="auth-email">
						Email
					</FieldLabel>
					<Input
						autoComplete={isSignUp ? "email" : "username"}
						className={INPUT_CLASS}
						id="auth-email"
						name="email"
						required
						type="email"
					/>
				</Field>
				<Field>
					<FieldLabel className="text-sm" htmlFor="auth-password">
						Password
					</FieldLabel>
					<Input
						aria-describedby={isSignUp ? "auth-password-hint" : undefined}
						autoComplete={isSignUp ? "new-password" : "current-password"}
						className={INPUT_CLASS}
						id="auth-password"
						maxLength={isSignUp ? 128 : undefined}
						minLength={isSignUp ? 8 : undefined}
						name="password"
						required
						type="password"
					/>
					{isSignUp ? (
						<FieldDescription id="auth-password-hint">
							Use at least 8 characters.
						</FieldDescription>
					) : null}
				</Field>
			</FieldGroup>
			{error ? (
				<FieldError className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2">
					{error}
				</FieldError>
			) : null}
			<Button
				className="site-button w-full active:not-aria-[haspopup]:translate-y-0"
				disabled={isSubmitting}
				type="submit"
			>
				{submitLabel}
			</Button>
			<span className="sr-only" role="status">
				{isSubmitting ? pendingLabel : ""}
			</span>
		</form>
	);
}
