"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  body: string;
  senderUserId: string;
  createdAt: string;
};

type ConversationThreadProps = {
  conversationId: string;
  currentUserId: string;
};

export function ConversationThread({ conversationId, currentUserId }: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    const response = await fetch(`/api/v1/conversations/${conversationId}/messages`);
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to load messages.");
      setLoading(false);
      return;
    }
    setMessages(payload.messages);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    const interval = window.setInterval(loadMessages, 4000);
    return () => window.clearInterval(interval);
  }, [conversationId]);

  async function sendMessage() {
    if (!text.trim()) {
      return;
    }
    const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Failed to send message.");
      return;
    }
    setText("");
    setMessages((prev) => [...prev, payload.message]);
  }

  const sorted = useMemo(
    () =>
      [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  return (
    <div className="space-y-4">
      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-border/60 p-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading messages...</p> : null}
        {sorted.map((message) => {
          const mine = message.senderUserId === currentUserId;
          return (
            <div key={message.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <p>{message.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Send a message..." />
        <Button onClick={sendMessage}>Send</Button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
