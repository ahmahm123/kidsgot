import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConversationThread } from "@/components/conversation-thread";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ConversationPage({ params }: PageProps) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const conversation = await db.conversation.findUnique({
    where: {
      id: params.id
    },
    include: {
      agent: { select: { name: true, id: true } },
      human: { select: { name: true, id: true } },
      bounty: { select: { title: true, id: true } }
    }
  });

  if (!conversation || (conversation.agentUserId !== session.user.id && conversation.humanUserId !== session.user.id)) {
    redirect("/dashboard");
  }

  return (
    <div className="container space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Agent: {conversation.agent.name || "Agent"}</p>
          <p>Human: {conversation.human.name || "Human"}</p>
          <p>Bounty: {conversation.bounty?.title || "Direct collaboration"}</p>
        </CardContent>
      </Card>
      <ConversationThread conversationId={conversation.id} currentUserId={session.user.id} />
    </div>
  );
}
