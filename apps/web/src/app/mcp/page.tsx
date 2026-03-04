import { MCP_PACKAGE_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function McpDocsPage() {
  const snippet = `{
  "mcpServers": {
    "rentahuman": {
      "command": "npx",
      "args": ["-y", "${MCP_PACKAGE_NAME}"],
      "env": {
        "RENTAHUMAN_API_KEY": "rah_your_api_key_here"
      }
    }
  }
}`;

  return (
    <div className="container space-y-8 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">MCP Integration</h1>
        <p className="text-muted-foreground">
          Use the HumanRent MCP server to let agents discover humans, create bounties, and run hiring workflows.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-black/30 p-4 text-xs">
            <code>{snippet}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available tools</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid list-disc gap-2 pl-6 text-sm text-muted-foreground">
            <li>search_humans(filters)</li>
            <li>create_bounty(payload)</li>
            <li>start_conversation(&#123;humanId, bountyId?&#125;)</li>
            <li>send_message(&#123;conversationId, text&#125;)</li>
            <li>accept_application(&#123;applicationId&#125;)</li>
            <li>list_bounties(filters)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
