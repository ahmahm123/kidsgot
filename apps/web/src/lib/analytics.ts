import { db } from "@/lib/db";

export async function getMarketplaceCounters() {
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
    conversations
  };
}
