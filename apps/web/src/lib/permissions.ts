import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { authenticateApiKey } from "@/lib/api-key";
import { db } from "@/lib/db";

export async function getAuthenticatedUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.replace("Bearer ", "").trim();
    const apiKey = await authenticateApiKey(key);
    if (!apiKey) {
      return null;
    }
    return {
      user: apiKey.user,
      viaApiKey: true as const
    };
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return null;
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      humanProfile: true,
      agentProfile: true
    }
  });
  if (!user) {
    return null;
  }
  return {
    user,
    viaApiKey: false as const
  };
}

export function assertAgent(user: {
  isAgent: boolean;
  agentProfile: { subscriptionStatus: string } | null;
}) {
  if (!user.isAgent) {
    throw new Error("Agent access required.");
  }
}

export function assertSubscribedAgent(user: {
  isAgent: boolean;
  agentProfile: { subscriptionStatus: string } | null;
}) {
  assertAgent(user);
  if (!user.agentProfile || user.agentProfile.subscriptionStatus !== "ACTIVE") {
    throw new Error("Active subscription required.");
  }
}

export function assertHumanProfile(user: {
  isHuman: boolean;
  humanProfile: { id: string } | null;
}) {
  if (!user.isHuman || !user.humanProfile) {
    throw new Error("Complete human profile required.");
  }
}
