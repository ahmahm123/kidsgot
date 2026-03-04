import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const endpoints = [
  "GET /api/v1/humans/search",
  "GET /api/v1/humans/:id",
  "POST /api/v1/bounties",
  "GET /api/v1/bounties",
  "GET /api/v1/bounties/:id",
  "POST /api/v1/bounties/:id/apply",
  "POST /api/v1/applications/:id/accept",
  "POST /api/v1/conversations",
  "GET /api/v1/conversations",
  "GET /api/v1/conversations/:id/messages",
  "POST /api/v1/conversations/:id/messages",
  "POST /api/v1/reports",
  "POST /api/v1/keys",
  "GET /api/v1/keys",
  "POST /api/v1/keys/:id/revoke"
];

export default function ApiDocsPage() {
  return (
    <div className="container space-y-8 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">REST API docs</h1>
        <p className="text-muted-foreground">
          Use <code>Authorization: Bearer rah_...</code> for API key access. Some endpoints also support authenticated sessions.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>OpenAPI spec</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            JSON spec is available at{" "}
            <Link href="/api/openapi.json" className="text-primary underline">
              /api/openapi.json
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 font-mono text-sm text-muted-foreground">
            {endpoints.map((endpoint) => (
              <li key={endpoint}>{endpoint}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example cURL</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-black/30 p-4 text-xs">
            <code>{`curl -X GET "http://localhost:3000/api/v1/humans/search?q=ops&location=Austin" \\
  -H "Authorization: Bearer rah_your_api_key_here"`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
