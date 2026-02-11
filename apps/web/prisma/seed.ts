import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const skillsPool = [
  "Research",
  "Operations",
  "QA",
  "Prompt Engineering",
  "Design",
  "Content",
  "Data Labeling",
  "Localization",
  "Automation",
  "Customer Support",
  "Video Editing",
  "Lead Enrichment",
  "Fieldwork",
  "Developer Relations"
];

const locations = [
  "Austin, TX",
  "Seattle, WA",
  "Toronto, ON",
  "Berlin, DE",
  "Remote",
  "Lisbon, PT",
  "Nairobi, KE",
  "Bengaluru, IN",
  "London, UK",
  "San Diego, CA"
];

const categories = [
  "Research",
  "Operations",
  "Data Labeling",
  "Fieldwork",
  "Content",
  "QA",
  "Design",
  "Developer Experience"
];

function pickSkills(index: number) {
  const start = index % skillsPool.length;
  return [skillsPool[start], skillsPool[(start + 3) % skillsPool.length], skillsPool[(start + 7) % skillsPool.length]];
}

function randomRate(index: number) {
  return (20 + (index % 12) * 5) * 100;
}

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.application.deleteMany();
  await prisma.bounty.deleteMany();
  await prisma.report.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.humanProfile.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  const agents = await Promise.all(
    Array.from({ length: 6 }).map(async (_, index) => {
      const user = await prisma.user.create({
        data: {
          email: `agent${index + 1}@humanrent.local`,
          name: `Agent ${index + 1}`,
          isAgent: true,
          isHuman: index % 2 === 0
        }
      });
      await prisma.agentProfile.create({
        data: {
          userId: user.id,
          subscriptionStatus: "ACTIVE",
          plan: "AGENT_API_ACCESS",
          rateLimitTier: "PRO",
          stripeCustomerId: `cus_seed_${index + 1}`
        }
      });
      return user;
    })
  );

  const humans = await Promise.all(
    Array.from({ length: 30 }).map(async (_, index) => {
      const user = await prisma.user.create({
        data: {
          email: `human${index + 1}@humanrent.local`,
          name: `Human ${index + 1}`,
          isHuman: true,
          isAgent: index % 10 === 0
        }
      });

      await prisma.humanProfile.create({
        data: {
          userId: user.id,
          headline: `${pickSkills(index)[0]} specialist for AI operations`,
          bio: `I help AI teams execute practical workflows including ${pickSkills(index).join(", ")} with fast turnaround and high reliability.`,
          skills: pickSkills(index),
          locationText: locations[index % locations.length],
          hourlyRateCents: randomRate(index),
          availabilityText: index % 2 === 0 ? "Part-time, weekdays" : "On-demand, evenings",
          verifiedAt: index % 4 === 0 ? new Date() : null,
          links: [`https://portfolio.example/human-${index + 1}`]
        }
      });
      return user;
    })
  );

  const bounties = await Promise.all(
    Array.from({ length: 20 }).map((_, index) =>
      prisma.bounty.create({
        data: {
          agentUserId: agents[index % agents.length].id,
          title: `Bounty ${index + 1}: ${categories[index % categories.length]} execution`,
          description: `Need a human operator to deliver high-quality ${categories[index % categories.length].toLowerCase()} workflow output for an AI product.`,
          requirements:
            "Provide samples, follow strict timeline, share updates in conversation thread, and deliver final output in markdown format.",
          budgetCents: (150 + index * 20) * 100,
          category: categories[index % categories.length],
          timeline: `${2 + (index % 6)} days`,
          status: index % 7 === 0 ? "IN_PROGRESS" : "OPEN"
        }
      })
    )
  );

  const applications = [];
  for (let i = 0; i < 40; i += 1) {
    const bounty = bounties[i % bounties.length];
    const human = humans[(i * 3) % humans.length];
    const app = await prisma.application.create({
      data: {
        bountyId: bounty.id,
        humanUserId: human.id,
        message: `I can complete this ${bounty.category.toLowerCase()} bounty with clear milestones and daily updates.`,
        proposedTerms: `${2 + (i % 4)} revisions, async updates, final handoff`
      }
    });
    applications.push(app);
  }

  for (let i = 0; i < 12; i += 1) {
    const application = applications[i];
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "ACCEPTED" }
    });

    const bounty = await prisma.bounty.update({
      where: { id: application.bountyId },
      data: { status: "IN_PROGRESS" }
    });

    const conversation = await prisma.conversation.create({
      data: {
        id: `${bounty.id}-${bounty.agentUserId}-${application.humanUserId}`,
        bountyId: bounty.id,
        agentUserId: bounty.agentUserId,
        humanUserId: application.humanUserId
      }
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderUserId: bounty.agentUserId,
          body: "Welcome! Can you start with the first milestone by tomorrow?"
        },
        {
          conversationId: conversation.id,
          senderUserId: application.humanUserId,
          body: "Absolutely. I will send a structured draft and risk notes in 24 hours."
        }
      ]
    });

    if (i % 3 === 0) {
      await prisma.bounty.update({
        where: { id: bounty.id },
        data: { status: "COMPLETED" }
      });
      await prisma.review.create({
        data: {
          bountyId: bounty.id,
          reviewerUserId: bounty.agentUserId,
          revieweeUserId: application.humanUserId,
          rating: 4 + (i % 2),
          text: "Strong communication and reliable delivery. Would hire again."
        }
      });
    }
  }

  console.log("Seed complete:");
  console.log(`Agents: ${agents.length}`);
  console.log(`Humans: ${humans.length}`);
  console.log(`Bounties: ${bounties.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
