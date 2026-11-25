import type { Metadata } from "next";

import AuthPage from "@/components/auth-page";

export const metadata: Metadata = { title: "Sign in | Tripo" };

export default function LoginPage() {
	return <AuthPage mode="sign-in" />;
}
