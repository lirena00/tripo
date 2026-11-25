import { cn } from "@tripo/ui/lib/utils";
import type { ComponentProps } from "react";

import { Label } from "./label";

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex w-full flex-col gap-5", className)}
			data-slot="field-group"
			{...props}
		/>
	);
}

function Field({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("group/field flex w-full flex-col gap-2", className)}
			data-slot="field"
			{...props}
		/>
	);
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
	return (
		<Label
			className={cn("w-fit leading-snug", className)}
			data-slot="field-label"
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn("text-muted-foreground text-xs/relaxed", className)}
			data-slot="field-description"
			{...props}
		/>
	);
}

function FieldError({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("text-destructive text-sm", className)}
			data-slot="field-error"
			role="alert"
			{...props}
		/>
	);
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
