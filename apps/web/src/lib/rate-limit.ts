import { addDays, addHours } from "date-fns";
import { db } from "@/lib/db";

export type RateLimitType = "bounties" | "conversations" | "messages";

export const RATE_LIMITS: Record<RateLimitType, { max: number; period: "day" | "hour" }> = {
  bounties: { max: 5, period: "day" },
  conversations: { max: 50, period: "day" },
  messages: { max: 30, period: "hour" }
};

export function getWindowStart(now: Date, period: "day" | "hour") {
  if (period === "day") {
    return addDays(now, -1);
  }
  return addHours(now, -1);
}

export function getWindowReset(now: Date, period: "day" | "hour") {
  if (period === "day") {
    return addDays(now, 1);
  }
  return addHours(now, 1);
}

export function evaluateRateLimit(used: number, max: number) {
  return {
    allowed: used < max,
    remaining: Math.max(0, max - used - 1)
  };
}

export async function checkAndConsumeRateLimit(userId: string, type: RateLimitType) {
  const now = new Date();
  const config = RATE_LIMITS[type];
  const windowStart = getWindowStart(now, config.period);

  const used = await db.usageEvent.count({
    where: {
      userId,
      type,
      createdAt: {
        gte: windowStart
      }
    }
  });

  if (used >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.max,
      resetAt: getWindowReset(now, config.period)
    };
  }

  await db.usageEvent.create({
    data: {
      userId,
      type
    }
  });

  return {
    allowed: true,
    remaining: evaluateRateLimit(used, config.max).remaining,
    limit: config.max,
    resetAt: getWindowReset(now, config.period)
  };
}

export async function getUsageSnapshot(userId: string) {
  const now = new Date();
  const entries = await Promise.all(
    (Object.keys(RATE_LIMITS) as RateLimitType[]).map(async (type) => {
      const config = RATE_LIMITS[type];
      const used = await db.usageEvent.count({
        where: {
          userId,
          type,
          createdAt: {
            gte: getWindowStart(now, config.period)
          }
        }
      });
      return {
        type,
        used,
        limit: config.max,
        remaining: Math.max(0, config.max - used),
        resetAt: getWindowReset(now, config.period)
      };
    })
  );
  return entries;
}
