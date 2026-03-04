import { NextRequest } from "next/server";
import { createApiKeyInputSchema } from "@humanrent/shared";
import { createApiKeyForUser } from "@/lib/api-key";
import { badRequest, created, ok, serverError, unauthorized } from "@/lib/api-response";
import { db } from "@/lib/db";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }
    if (auth.viaApiKey) {
      return unauthorized("Session login required.");
    }
    if (!auth.user.isAgent || auth.user.agentProfile?.subscriptionStatus !== "ACTIVE") {
      return unauthorized("Active subscription required.");
    }

    const keys = await db.apiKey.findMany({
      where: {
        userId: auth.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return ok({ keys });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserFromRequest(request);
    if (!auth?.user) {
      return unauthorized();
    }
    if (auth.viaApiKey) {
      return unauthorized("Session login required.");
    }
    if (!auth.user.isAgent || auth.user.agentProfile?.subscriptionStatus !== "ACTIVE") {
      return unauthorized("Active subscription required.");
    }

    const payload = await request.json();
    const parsed = createApiKeyInputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid API key payload.", {
        issues: parsed.error.issues
      });
    }

    const result = await createApiKeyForUser(auth.user.id, parsed.data.label);
    return created({
      key: result.key,
      apiKey: result.apiKey
    });
  } catch (error) {
    console.error(error);
    return badRequest((error as Error).message || "Could not create API key.");
  }
}
