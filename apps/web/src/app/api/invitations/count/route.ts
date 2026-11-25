import { getCurrentUser } from "@/lib/session";
import { getPendingInvitationCount } from "@/lib/trip-queries";

export async function GET() {
	const viewer = await getCurrentUser();
	if (!viewer) {
		return new Response(null, { status: 401 });
	}
	const count = await getPendingInvitationCount(viewer.id);
	return Response.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
}
