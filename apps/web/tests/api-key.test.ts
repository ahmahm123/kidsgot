import { describe, expect, it } from "vitest";
import { __internal, generateApiKeySecret } from "@/lib/api-key";

describe("api key helpers", () => {
  it("generates keys with rah_ prefix", () => {
    const key = generateApiKeySecret();
    expect(key.startsWith("rah_")).toBe(true);
    expect(key.length).toBeGreaterThan(20);
  });

  it("hashing is deterministic", () => {
    const key = "rah_test_123";
    expect(__internal.sha256(key)).toBe(__internal.sha256(key));
    expect(__internal.sha256(key)).not.toBe(__internal.sha256("rah_other"));
  });
});
