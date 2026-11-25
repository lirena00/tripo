"use client";

import type { Session } from "@tripo/auth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@tripo/ui/components/dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { PersonAvatar } from "./person-avatar";

export default function UserMenu({
	user,
}: {
	user: Pick<Session["user"], "email" | "id" | "name">;
}) {
	const [isSigningOut, setIsSigningOut] = useState(false);

	async function signOut() {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);
		try {
			const { error } = await authClient.signOut();
			if (error) {
				toast.error("Couldn't sign out. Please try again.");
				return;
			}

			window.location.replace("/login");
		} catch {
			toast.error("Couldn't sign out. Please try again.");
		} finally {
			setIsSigningOut(false);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Your account"
				className="account-trigger"
			>
				<PersonAvatar id={user.id} />
				<ChevronDown
					aria-hidden="true"
					className="size-3.5 text-muted-foreground"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-60 rounded-lg p-1 motion-reduce:animate-none"
				sideOffset={6}
			>
				<div className="flex min-w-0 flex-col px-2 py-1.5">
					<span className="truncate font-medium text-sm">{user.name}</span>
					<span className="truncate text-muted-foreground text-xs">
						{user.email}
					</span>
				</div>
				<DropdownMenuSeparator className="my-1" />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="min-h-7 rounded-md py-1 text-xs/relaxed"
						disabled={isSigningOut}
						onClick={signOut}
						variant="destructive"
					>
						<LogOut aria-hidden="true" className="size-3.5" />
						{isSigningOut ? "Signing out…" : "Sign out"}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
