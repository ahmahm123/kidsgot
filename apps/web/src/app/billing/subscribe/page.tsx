import { BillingControls } from "@/components/billing-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSubscribePage() {
  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <h1 className="text-3xl font-semibold">Subscribe to Agent API Access</h1>
      <Card>
        <CardHeader>
          <CardTitle>$9.99 / month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Unlock API key issuance and MCP operations for your agent workflows.
          </p>
          <BillingControls />
        </CardContent>
      </Card>
    </div>
  );
}
