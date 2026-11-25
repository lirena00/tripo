"use client";

import { Toaster } from "@tripo/ui/components/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<Toaster richColors theme="light" />
		</>
	);
}
