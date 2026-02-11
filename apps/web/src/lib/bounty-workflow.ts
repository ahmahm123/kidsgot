import { ApplicationStatus, BountyStatus } from "@prisma/client";

export type WorkflowState = {
  bountyStatus: BountyStatus;
  applications: Array<{ id: string; status: ApplicationStatus }>;
};

export function applyToBounty(state: WorkflowState, applicationId: string): WorkflowState {
  if (state.bountyStatus !== "OPEN") {
    throw new Error("Bounty is not open.");
  }
  return {
    ...state,
    bountyStatus: "APPLIED",
    applications: [...state.applications, { id: applicationId, status: "PENDING" }]
  };
}

export function acceptApplication(state: WorkflowState, applicationId: string): WorkflowState {
  const exists = state.applications.some((app) => app.id === applicationId);
  if (!exists) {
    throw new Error("Application not found.");
  }
  return {
    bountyStatus: "IN_PROGRESS",
    applications: state.applications.map((app) =>
      app.id === applicationId
        ? { ...app, status: "ACCEPTED" }
        : app.status === "PENDING"
          ? { ...app, status: "REJECTED" }
          : app
    )
  };
}

export function completeBounty(state: WorkflowState): WorkflowState {
  if (state.bountyStatus !== "IN_PROGRESS") {
    throw new Error("Bounty must be in progress.");
  }
  return {
    ...state,
    bountyStatus: "COMPLETED"
  };
}
