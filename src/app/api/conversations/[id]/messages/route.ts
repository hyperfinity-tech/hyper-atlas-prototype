import { auth } from "@clerk/nextjs/server";
import { db, conversations, messages } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First verify the conversation belongs to this user
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.clerkUserId, userId))
    );

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get all messages for this conversation
  const conversationMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      citations: messages.citations,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return Response.json(conversationMessages);
}
