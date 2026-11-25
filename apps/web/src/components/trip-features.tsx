import {
	ArrowLeftRight,
	ArrowRight,
	ArrowUpRight,
	ReceiptText,
	Users,
} from "lucide-react";
import Image from "next/image";

import SplitPreview from "./split-preview";

function ExpensePreview() {
	return (
		<figure className="m-3 mb-0 overflow-hidden rounded-[9px] border border-border sm:m-4 sm:mb-0">
			<div className="flex items-center gap-2 border-border border-b bg-background px-3 py-2 text-muted-foreground text-xs">
				<ArrowLeftRight aria-hidden="true" className="size-4 text-primary" />
				Goa weekend
			</div>
			<div className="feature-dither grid min-h-66 grid-cols-[minmax(0,1fr)_minmax(8.5rem,46%)] items-center gap-2 p-2 sm:min-h-80 sm:gap-3 sm:p-3.5">
				<div className="relative h-52 overflow-hidden rounded-lg border border-primary/20 bg-accent/45 sm:h-70">
					<Image
						alt=""
						className="object-contain"
						fill
						sizes="(max-width: 767px) 42vw, 360px"
						src="/features/receipt.webp"
					/>
				</div>
				<div className="rounded-xl bg-card p-3.5 shadow-[0_8px_24px_-4px_rgb(8_12_20_/_22%)] sm:p-4">
					<div className="mb-3 flex items-center gap-1.5 font-medium text-xs">
						<ReceiptText aria-hidden="true" className="size-4 text-primary" />
						New expense
					</div>
					<dl className="grid gap-2.5 text-xs">
						<div className="rounded-md bg-muted px-2.5 py-2">
							<dt className="text-[10px] text-muted-foreground">Description</dt>
							<dd className="mt-0.5">Dinner in Goa</dd>
						</div>
						<div className="rounded-md bg-muted px-2.5 py-2">
							<dt className="text-[10px] text-muted-foreground">Amount</dt>
							<dd className="mt-0.5 font-medium tabular-nums">₹2,400</dd>
						</div>
						<div className="flex items-center justify-between gap-1 whitespace-nowrap px-1 text-[11px] sm:gap-2 sm:text-xs">
							<dt className="text-muted-foreground">Paid by</dt>
							<dd>Riya</dd>
						</div>
						<div className="flex items-center justify-between gap-1 whitespace-nowrap px-1 text-[11px] sm:gap-2 sm:text-xs">
							<dt className="text-muted-foreground">Split with</dt>
							<dd>3 people</dd>
						</div>
					</dl>
				</div>
			</div>
			<figcaption className="flex min-h-8 items-center justify-between gap-2 bg-background px-3 text-muted-foreground text-xs">
				<span>Example expense</span>
				<span>
					Receipt <span aria-hidden="true">→</span> split
				</span>
			</figcaption>
		</figure>
	);
}

function TripHistoryPreview() {
	return (
		<div
			aria-hidden="true"
			className="feature-dither relative isolate flex h-51 items-center justify-center gap-2 px-5 sm:gap-3 sm:px-9"
		>
			<div className="feature-trip-card relative translate-y-1.5 -rotate-6">
				<Image
					alt=""
					className="object-cover"
					fill
					sizes="(max-width: 767px) 30vw, 220px"
					src="/features/goa-coast.webp"
				/>
				<span>Goa weekend</span>
			</div>
			<div className="feature-trip-card relative z-1 grid -translate-y-2 rotate-3 place-items-center">
				<p className="px-1 pb-4 font-heading text-primary text-xl sm:text-3xl">
					₹6,000
				</p>
				<span>Trip total</span>
			</div>
			<div className="feature-trip-card relative grid translate-y-2 rotate-8 place-items-center bg-primary text-primary-foreground">
				<Users className="mb-4 size-8" />
				<span>4 travelers</span>
			</div>
			<div className="absolute right-6 bottom-3 z-2 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-primary text-xs">
				Trip summary <ArrowUpRight className="size-3.5" />
			</div>
		</div>
	);
}

function SettlementPreview() {
	return (
		<div
			aria-hidden="true"
			className="feature-dither relative isolate h-46 overflow-hidden"
		>
			<div className="absolute top-4 left-[9%] w-[60%] -rotate-7 rounded-lg border border-border bg-background p-4 text-muted-foreground text-xs">
				<p className="mb-3 font-medium text-foreground">Open balances</p>
				<p className="mb-2 flex justify-between">
					Riya <span>+₹1,600</span>
				</p>
				<p className="flex justify-between">
					Dev <span>−₹800</span>
				</p>
			</div>
			<div className="absolute right-[7%] bottom-7 flex rotate-5 items-center gap-2 rounded-lg border border-primary/40 bg-card px-3 py-3 text-primary text-xs shadow-sm">
				Dev <ArrowRight className="size-3.5" /> Riya <strong>₹800</strong>
			</div>
		</div>
	);
}

export default function TripFeatures() {
	return (
		<section
			aria-labelledby="features-title"
			className="feature-section site-width scroll-mt-24"
			id="features"
		>
			<div className="mx-auto mb-8 max-w-2xl text-center md:mb-12">
				<h2 className="feature-title font-heading" id="features-title">
					A little less math.
					<span className="block text-primary">A lot more trip.</span>
				</h2>
				<p className="mx-auto mt-5 max-w-[470px] text-pretty text-muted-foreground text-sm/7">
					The stay, the fuel, and dinner with just a few friends. Keep them in
					one place and see what everyone owes.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-12 md:gap-5">
				<article className="feature-panel md:col-span-7">
					<ExpensePreview />
					<div className="feature-panel-copy">
						<h3>Add it as you go.</h3>
						<p>
							Record the cost, who paid, and who shared it while it’s still
							fresh.
						</p>
					</div>
				</article>

				<article className="feature-panel p-6 md:col-span-5 md:p-7.5">
					<div className="feature-panel-copy p-0">
						<h3>
							Split it with
							<br /> the right people.
						</h3>
						<p>
							Share an expense with everyone, or only the people it was for.
						</p>
					</div>
					<SplitPreview />
				</article>

				<article className="feature-panel md:col-span-7">
					<TripHistoryPreview />
					<div className="feature-panel-copy">
						<h3>One place for the whole trip.</h3>
						<p>
							See the expenses and balances together when it’s time to settle
							up.
						</p>
					</div>
				</article>

				<article className="feature-panel md:col-span-5">
					<div className="feature-panel-copy">
						<h3>Fewer payments to settle up.</h3>
						<p>See who needs to pay whom and how much.</p>
					</div>
					<SettlementPreview />
				</article>
			</div>
		</section>
	);
}
