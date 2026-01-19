import { auth } from "@clerk/nextjs/server";
import { db, conversations } from "@/lib/db";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.clerkUserId, userId))
    );

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(conversation);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.clerkUserId, userId))
    );

  return Response.json({ success: true });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title } = await request.json();

  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(
      and(eq(conversations.id, id), eq(conversations.clerkUserId, userId))
    )
    .returning({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    });

  if (!updated) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(updated);
}
