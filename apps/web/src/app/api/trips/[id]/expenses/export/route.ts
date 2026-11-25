import { z } from "zod";

import {
	formatExpensesCsv,
	getExpensesCsvDisposition,
} from "@/lib/expense-export";
import { getCurrentUser } from "@/lib/session";
import { getTripExpenses, getTripMembership } from "@/lib/trip-queries";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const [viewer, { id }] = await Promise.all([getCurrentUser(), params]);
	const trip =
		viewer && z.uuid().safeParse(id).success
			? await getTripMembership(id, viewer.id)
			: undefined;
	if (!trip) {
		return Response.json({ error: "Trip not found." }, { status: 404 });
	}

	const expenses = await getTripExpenses(id);
	return new Response(formatExpensesCsv(expenses, trip.currency), {
		headers: {
			"Cache-Control": "private, no-store",
			"Content-Disposition": getExpensesCsvDisposition(trip.name),
			"Content-Type": "text/csv; charset=utf-8",
		},
	});
}
