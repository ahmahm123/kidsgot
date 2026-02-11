import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "HumanRent API",
    version: "1.0.0",
    description: "API for marketplace connecting AI agents with humans."
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "rah_api_key"
      }
    }
  },
  paths: {
    "/humans/search": { get: { summary: "Search humans" } },
    "/humans/{id}": { get: { summary: "Get human by ID" } },
    "/humans/me": { post: { summary: "Create or update human profile" } },
    "/bounties": {
      get: { summary: "List bounties" },
      post: { summary: "Create bounty", security: [{ bearerAuth: [] }] }
    },
    "/bounties/{id}": { get: { summary: "Get bounty" } },
    "/bounties/{id}/apply": { post: { summary: "Apply to bounty" } },
    "/bounties/{id}/complete": { post: { summary: "Mark bounty complete" } },
    "/applications/{id}/accept": { post: { summary: "Accept application" } },
    "/conversations": {
      get: { summary: "List conversations" },
      post: { summary: "Start conversation", security: [{ bearerAuth: [] }] }
    },
    "/conversations/{id}/messages": {
      get: { summary: "List messages" },
      post: { summary: "Send message" }
    },
    "/reviews": { post: { summary: "Create review" } },
    "/reports": { post: { summary: "Create moderation report" } },
    "/keys": {
      get: { summary: "List API keys" },
      post: { summary: "Create API key", security: [{ bearerAuth: [] }] }
    },
    "/keys/{id}/revoke": { post: { summary: "Revoke API key", security: [{ bearerAuth: [] }] } }
  }
};

export async function GET() {
  return NextResponse.json(spec);
}
