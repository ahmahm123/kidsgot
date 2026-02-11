import { NextRequest } from "next/server";
import { revokeApiKey } from "@/lib/api-key";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUserFromRequest } from "@/lib/permissions";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
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

    const result = await revokeApiKey(auth.user.id, context.params.id);
    if (result.count === 0) {
      return badRequest("API key not found.");
    }
    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
