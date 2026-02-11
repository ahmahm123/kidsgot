#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  createBountyInputSchema,
  searchHumansInputSchema,
  sendMessageInputSchema,
  startConversationInputSchema
} from "@humanrent/shared";

const baseUrl = process.env.RENTAHUMAN_API_URL || "http://localhost:3000/api/v1";
const apiKey = process.env.RENTAHUMAN_API_KEY;

if (!apiKey) {
  console.error("Missing RENTAHUMAN_API_KEY. Set it before running MCP server.");
  process.exit(1);
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = payload?.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }
  return payload;
}

const tools: Tool[] = [
  {
    name: "search_humans",
    description: "Search HumanRent marketplace humans by filters.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string" },
        location: { type: "string" },
        minRate: { type: "number" },
        maxRate: { type: "number" },
        availability: { type: "string" },
        limit: { type: "number" },
        cursor: { type: "string" },
        sort: { type: "string", enum: ["relevance", "rate_asc", "rate_desc", "newest"] }
      }
    }
  },
  {
    name: "create_bounty",
    description: "Create a new bounty as an agent account.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        requirements: { type: "string" },
        budgetCents: { type: "number" },
        category: { type: "string" },
        timeline: { type: "string" }
      },
      required: ["title", "description", "requirements", "budgetCents", "category"]
    }
  },
  {
    name: "start_conversation",
    description: "Start a conversation with a human for a bounty or direct work.",
    inputSchema: {
      type: "object",
      properties: {
        humanId: { type: "string" },
        bountyId: { type: "string" }
      },
      required: ["humanId"]
    }
  },
  {
    name: "send_message",
    description: "Send a message inside a conversation.",
    inputSchema: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        text: { type: "string" }
      },
      required: ["conversationId", "text"]
    }
  },
  {
    name: "accept_application",
    description: "Accept a pending bounty application.",
    inputSchema: {
      type: "object",
      properties: {
        applicationId: { type: "string" }
      },
      required: ["applicationId"]
    }
  },
  {
    name: "list_bounties",
    description: "List bounties using optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
        cursor: { type: "string" }
      }
    }
  }
];

const server = new Server(
  {
    name: "@humanrent/rentahuman-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (requestData) => {
  const { name, arguments: args } = requestData.params;
  try {
    if (name === "search_humans") {
      const parsed = searchHumansInputSchema.partial().parse(args ?? {});
      const query = new URLSearchParams(
        Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {})
      ).toString();
      const data = await request(`/humans/search?${query}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "create_bounty") {
      const parsed = createBountyInputSchema.parse(args ?? {});
      const data = await request("/bounties", {
        method: "POST",
        body: JSON.stringify(parsed)
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "start_conversation") {
      const parsed = startConversationInputSchema.parse(args ?? {});
      const data = await request("/conversations", {
        method: "POST",
        body: JSON.stringify(parsed)
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "send_message") {
      const parsed = z
        .object({
          conversationId: z.string(),
          text: sendMessageInputSchema.shape.text
        })
        .parse(args ?? {});
      const data = await request(`/conversations/${parsed.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: parsed.text })
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "accept_application") {
      const parsed = z.object({ applicationId: z.string() }).parse(args ?? {});
      const data = await request(`/applications/${parsed.applicationId}/accept`, {
        method: "POST"
      });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "list_bounties") {
      const parsed = z
        .object({
          category: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().int().positive().max(50).optional(),
          cursor: z.string().optional()
        })
        .parse(args ?? {});
      const query = new URLSearchParams(
        Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {})
      ).toString();
      const data = await request(`/bounties?${query}`);
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: (error as Error).message }]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
