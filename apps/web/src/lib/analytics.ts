import { db } from "@/lib/db";
import { hasDatabaseUrl } from "@/lib/env";

export async function getMarketplaceCounters() {
  if (!hasDatabaseUrl) {
    return {
      humans: 0,
      openBounties: 0,
      completedBounties: 0,
      applications: 0,
      conversations: 0,
      databaseReady: false
    };
  }

  try {
    const [humans, openBounties, completedBounties, applications, conversations] = await Promise.all([
      db.humanProfile.count(),
      db.bounty.count({ where: { status: "OPEN" } }),
      db.bounty.count({ where: { status: "COMPLETED" } }),
      db.application.count(),
      db.conversation.count()
    ]);

    return {
      humans,
      openBounties,
      completedBounties,
      applications,
      conversations,
      databaseReady: true
    };
  } catch {
    return {
      humans: 0,
      openBounties: 0,
      completedBounties: 0,
      applications: 0,
      conversations: 0,
      databaseReady: false
    };
  }
}
