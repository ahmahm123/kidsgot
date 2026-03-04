import { describe, expect, it } from "vitest";
import { evaluateRateLimit, getWindowReset, getWindowStart } from "@/lib/rate-limit";

describe("rate-limit helpers", () => {
  it("computes allowed and remaining usage", () => {
    expect(evaluateRateLimit(0, 5)).toEqual({ allowed: true, remaining: 4 });
    expect(evaluateRateLimit(4, 5)).toEqual({ allowed: true, remaining: 0 });
    expect(evaluateRateLimit(5, 5)).toEqual({ allowed: false, remaining: 0 });
  });

  it("computes hourly and daily windows", () => {
    const now = new Date("2026-02-11T10:00:00.000Z");
    expect(getWindowStart(now, "hour").toISOString()).toBe("2026-02-11T09:00:00.000Z");
    expect(getWindowStart(now, "day").toISOString()).toBe("2026-02-10T10:00:00.000Z");
    expect(getWindowReset(now, "hour").toISOString()).toBe("2026-02-11T11:00:00.000Z");
    expect(getWindowReset(now, "day").toISOString()).toBe("2026-02-12T10:00:00.000Z");
  });
});
