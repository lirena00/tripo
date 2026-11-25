import { z } from "zod";

import { getCurrentUser } from "@/lib/session";
import { findInvitableUsers, getTripMembership } from "@/lib/trip-queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const [viewer, { id }] = await Promise.all([getCurrentUser(), params]);
	if (!viewer || !z.uuid().safeParse(id).success ||
		(await getTripMembership(id, viewer.id))?.role !== "owner") {
		return Response.json({ error: "Trip not found." }, { status: 404 });
	}
	const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
	const users = query.length >= 2 && query.length <= 254 ? await findInvitableUsers(id, viewer.id, query) : [];
	return Response.json(users, { headers: { "Cache-Control": "private, no-store" } });
}
