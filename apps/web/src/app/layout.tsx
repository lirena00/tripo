import type { Metadata } from "next";
import { ABeeZee, Inter } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

const abeezee = ABeeZee({
	subsets: ["latin"],
	variable: "--font-abeezee",
	weight: "400",
});

export const metadata: Metadata = {
	description:
		"Track shared trip expenses, see who owes what, and settle up in fewer payments.",
	title: "Tripo | Split trip expenses",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className={`${inter.variable} ${abeezee.variable}`} lang="en">
			<body className="min-h-svh antialiased">
				<Providers>
					<a
						className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-20 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
						href="#main-content"
					>
						Skip to content
					</a>
					{children}
				</Providers>
			</body>
		</html>
	);
}
