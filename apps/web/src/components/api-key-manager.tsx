"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiKeyRecord = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [label, setLabel] = useState("Default key");
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    const response = await fetch("/api/v1/keys");
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to load API keys.");
      return;
    }
    setKeys(payload.keys);
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function createKey() {
    setError(null);
    const response = await fetch("/api/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to create key.");
      return;
    }
    setNewKeyValue(payload.key);
    await loadKeys();
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/v1/keys/${id}/revoke`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to revoke key.");
      return;
    }
    await loadKeys();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="API key label" />
        <Button onClick={createKey}>Create API key</Button>
      </div>
      {newKeyValue ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <p className="font-semibold">Save this key now:</p>
          <code>{newKeyValue}</code>
        </div>
      ) : null}
      <div className="space-y-2">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div className="text-sm">
              <p className="font-medium">{key.label}</p>
              <p className="text-muted-foreground">
                {key.prefix}... · created {new Date(key.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {key.revokedAt ? (
                <span className="text-xs text-muted-foreground">revoked</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => revoke(key.id)}>
                  Revoke
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
