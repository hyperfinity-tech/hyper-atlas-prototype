import { auth } from "@clerk/nextjs/server";
import { db, conversations } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userConversations = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.clerkUserId, userId))
    .orderBy(desc(conversations.updatedAt));

  return Response.json(userConversations);
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [newConversation] = await db
    .insert(conversations)
    .values({
      clerkUserId: userId,
      title: "New conversation",
    })
    .returning({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    });

  return Response.json(newConversation);
}
