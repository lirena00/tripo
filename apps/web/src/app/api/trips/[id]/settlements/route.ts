import { z } from "zod";

import { getCurrentUser } from "@/lib/session";
import { getTripSettlement } from "@/lib/trip-ledger";
import { getTripMembership } from "@/lib/trip-queries";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const [viewer, { id }] = await Promise.all([getCurrentUser(), params]);
	if (!(viewer && z.uuid().safeParse(id).success)) {
		return Response.json({ error: "Trip not found." }, { status: 404 });
	}
	const trip = await getTripMembership(id, viewer.id);
	if (!trip) {
		return Response.json({ error: "Trip not found." }, { status: 404 });
	}
	const plan = await getTripSettlement(id);
	return Response.json(
		{ ...plan, currency: trip.currency },
		{ headers: { "Cache-Control": "private, no-store" } }
	);
}
