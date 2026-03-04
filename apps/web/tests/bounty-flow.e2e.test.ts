import { describe, expect, it } from "vitest";
import { acceptApplication, applyToBounty, completeBounty, WorkflowState } from "@/lib/bounty-workflow";

describe("bounty flow e2e", () => {
  it("runs apply -> accept -> complete flow", () => {
    const initial: WorkflowState = {
      bountyStatus: "OPEN",
      applications: []
    };

    const afterApply = applyToBounty(initial, "app_1");
    expect(afterApply.bountyStatus).toBe("APPLIED");
    expect(afterApply.applications).toHaveLength(1);
    expect(afterApply.applications[0].status).toBe("PENDING");

    const withSecond = {
      ...afterApply,
      applications: [...afterApply.applications, { id: "app_2", status: "PENDING" as const }]
    };

    const afterAccept = acceptApplication(withSecond, "app_2");
    expect(afterAccept.bountyStatus).toBe("IN_PROGRESS");
    expect(afterAccept.applications.find((a) => a.id === "app_2")?.status).toBe("ACCEPTED");
    expect(afterAccept.applications.find((a) => a.id === "app_1")?.status).toBe("REJECTED");

    const afterComplete = completeBounty(afterAccept);
    expect(afterComplete.bountyStatus).toBe("COMPLETED");
  });
});
