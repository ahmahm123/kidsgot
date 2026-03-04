import { NextRequest } from "next/server";
import { reportInputSchema } from "@humanrent/shared";
import { db } from "@/lib/db";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";
import { sanitizeText } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }

    const payload = await request.json();
    const parsed = reportInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid report payload.", {
        issues: parsed.error.issues
      });
    }

    const report = await db.report.create({
      data: {
        reporterUserId: auth.user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reason: sanitizeText(parsed.data.reason)
      }
    });

    return created({ report });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
