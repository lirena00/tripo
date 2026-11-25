import {
	ArrowRight,
	ArrowUpRight,
	ReceiptText,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";

import Header, { TripoBrand } from "@/components/header";
import MoneySky from "@/components/money-sky";
import TripFeatures from "@/components/trip-features";

const examplePayments = [
	{ amount: "₹800", from: "Dev", to: "Riya" },
	{ amount: "₹800", from: "Mira", to: "Riya" },
] as const;

function ExampleTrip() {
	return (
		<section
			aria-labelledby="example-title"
			className="site-width scroll-mt-24 pb-16 text-center md:pb-20"
			id="example-trip"
		>
			<h2 className="feature-title font-heading" id="example-title">
				Four friends.
				<span className="block text-primary">Two payments.</span>
			</h2>
			<p className="mx-auto mt-5 max-w-md text-pretty text-muted-foreground text-sm/7">
				Here’s how a ₹6,000 weekend in Goa can settle up.
			</p>
			<figure className="mx-auto mt-8 max-w-md overflow-hidden rounded-2xl border border-border bg-card text-left md:mt-10">
				<figcaption className="feature-dither border-border border-b px-6 py-6">
					<p className="mb-1 text-muted-foreground text-xs">Example trip</p>
					<p className="font-heading text-2xl tracking-tight">Goa weekend</p>
				</figcaption>
				<div className="px-6 py-5">
					<ul aria-label="Example payments" className="divide-y divide-border">
						{examplePayments.map(({ amount, from, to }) => (
							<li
								className="flex items-center justify-between gap-3 py-3 text-sm"
								key={from}
							>
								<span className="flex items-center gap-3">
									{from}
									<ArrowRight
										aria-label="pays"
										className="size-4 text-primary"
									/>
									{to}
								</span>
								<strong className="font-medium text-primary tabular-nums">
									{amount}
								</strong>
							</li>
						))}
					</ul>
					<p className="mt-3 text-muted-foreground text-xs/5">
						Riya gets ₹1,600 back. Arjun has already covered his share.
					</p>
				</div>
			</figure>
		</section>
	);
}

export default function Home() {
	return (
		<div id="top">
			<Header />
			<main id="main-content" tabIndex={-1}>
				<section aria-labelledby="hero-title" className="landing-hero">
					<MoneySky />
					<div className="landing-hero-content relative mx-auto w-full max-w-6xl px-5">
						<div className="landing-hero-copy mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
							<h1 className="landing-title font-heading" id="hero-title">
								Split the trip.
								<span className="block text-primary">Settle up together.</span>
							</h1>
							<p className="max-w-lg text-muted-foreground text-sm/7 sm:text-[15px]">
								Track shared trip expenses, see who owes what, and settle up in
								fewer payments.
							</p>
							<div className="flex flex-wrap justify-center gap-3">
								<Link className="site-button" href="/signup">
									Get started
									<ArrowUpRight aria-hidden="true" className="size-4" />
								</Link>
								<a
									className="site-button site-button--secondary"
									href="#features"
								>
									See how it works
								</a>
							</div>
							<ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
								<li className="flex items-center gap-1.5">
									<ReceiptText aria-hidden="true" className="size-3.5" /> Shared
									expenses
								</li>
								<li className="flex items-center gap-1.5">
									<Users aria-hidden="true" className="size-3.5" /> Group splits
								</li>
								<li className="flex items-center gap-1.5">
									<Wallet aria-hidden="true" className="size-3.5" /> Settle up
								</li>
							</ul>
						</div>
					</div>
				</section>

				<TripFeatures />
				<ExampleTrip />

				<section
					aria-labelledby="start-title"
					className="site-width pt-4 pb-16 md:pt-8 md:pb-24"
				>
					<div className="landing-start grid items-center gap-8 rounded-2xl border border-border bg-card px-6 py-8 md:grid-cols-2 md:px-12 md:py-14">
						<div>
							<h2
								className="font-heading text-[clamp(2rem,3.5vw,2.75rem)] leading-tight tracking-tight"
								id="start-title"
							>
								The next trip
								<span className="block text-primary">starts here.</span>
							</h2>
							<p className="mt-4 text-muted-foreground text-sm/6">
								Create a Tripo account to get started.
							</p>
						</div>
						<Link
							className="site-button w-fit md:justify-self-end"
							href="/signup"
						>
							Create an account
							<ArrowUpRight aria-hidden="true" className="size-4" />
						</Link>
					</div>
				</section>
			</main>
			<footer className="landing-footer border-border border-t">
				<div className="site-width flex min-h-44 flex-col items-start justify-between gap-8 pt-9 pb-6 md:min-h-56">
					<TripoBrand />
					<p className="w-full border-border border-t pt-4 text-muted-foreground text-xs">
						© Tripo
					</p>
				</div>
			</footer>
		</div>
	);
}
