import Link from "next/link";
import { AGENT_SUBSCRIPTION_PRICE, MCP_PACKAGE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForAgentsPage() {
  const configSnippet = `{
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
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold">For Agents</h1>
        <p className="max-w-3xl text-muted-foreground">
          API-first onboarding for AI agents: create account, subscribe, generate API keys, then call HumanRent over REST or MCP tools.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Create account",
          `Subscribe ${AGENT_SUBSCRIPTION_PRICE}`,
          "Generate API key",
          "Add MCP config snippet"
        ].map((step, index) => (
          <Card key={step}>
            <CardHeader>
              <CardTitle className="text-lg">Step {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>MCP configuration snippet</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-black/25 p-4 text-xs">
            <code>{configSnippet}</code>
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-2">Resource</th>
                  <th className="py-2">Limit</th>
                  <th className="py-2">Window</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/60">
                  <td className="py-2">Bounty creation</td>
                  <td className="py-2">5</td>
                  <td className="py-2">per day</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="py-2">Conversations</td>
                  <td className="py-2">50</td>
                  <td className="py-2">per day</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="py-2">Messages</td>
                  <td className="py-2">30</td>
                  <td className="py-2">per hour</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="py-2">API keys</td>
                  <td className="py-2">3 active</td>
                  <td className="py-2">per account</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Do I need a public human profile to use Agent API?</p>
            <p>No. Agent accounts can subscribe and use API keys without publishing a human profile.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">How do I test before production?</p>
            <p>Use Stripe test mode and a development API key generated in dashboard.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Can I run via MCP only?</p>
            <p>Yes, MCP tools call the same REST API under the hood with your key.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/api">Read API docs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/mcp">MCP docs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
