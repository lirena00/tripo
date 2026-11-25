import { Card, CardContent } from "@tripo/ui/components/card";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";

import AuthForm from "./auth-form";
import Header from "./header";

export default async function AuthPage({
	mode,
}: {
	mode: "sign-in" | "sign-up";
}) {
	const user = await getCurrentUser();
	if (user) {
		redirect("/dashboard");
	}

	const isSignUp = mode === "sign-up";

	return (
		<>
		<Header />
		<main
			className="grid min-h-svh place-items-center px-5 pt-28 pb-10 sm:pb-16"
			id="main-content"
			tabIndex={-1}
		>
			<div className="grid w-full max-w-sm gap-6">
				<h1 className="text-center font-heading text-3xl tracking-tight sm:text-4xl">
					{isSignUp ? "Create your account" : "Welcome back"}
				</h1>
				<Card className="rounded-2xl border border-border ring-0 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
					<CardContent>
						<AuthForm mode={mode} />
					</CardContent>
				</Card>
				<p className="text-center text-muted-foreground text-sm">
					{isSignUp ? "Already have an account?" : "New to Tripo?"}{" "}
					<Link
						className="font-medium text-primary underline-offset-4 hover:underline"
						href={isSignUp ? "/login" : "/signup"}
					>
						{isSignUp ? "Sign in" : "Create an account"}
					</Link>
				</p>
			</div>
		</main>
		</>
	);
}
