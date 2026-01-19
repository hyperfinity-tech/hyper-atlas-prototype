import { auth } from "@clerk/nextjs/server";
import { getGenAI, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";
import { db, conversations, messages } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { Message, Citation } from "@/lib/types";

export const runtime = "nodejs";

interface ChatRequest {
  message: string;
  history: Message[];
  conversationId?: string;
}

async function generateTitle(userMessage: string, assistantResponse: string): Promise<string> {
  const genai = getGenAI();

  const result = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate a very short title (3-5 words max) for this conversation. Just return the title, nothing else.

User: ${userMessage.slice(0, 200)}
Assistant: ${assistantResponse.slice(0, 200)}`,
          },
        ],
      },
    ],
  });

  return result.text?.trim() || "New conversation";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  const { message, history, conversationId }: ChatRequest = await request.json();

  // Build conversation history for Gemini
  const contents = history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));

  // Add the new user message
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Save user message to database if we have a conversation
  if (userId && conversationId) {
    // Verify user owns this conversation
    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.clerkUserId, userId)
        )
      );

    if (conversation) {
      await db.insert(messages).values({
        conversationId,
        role: "user",
        content: message,
      });

      // Update conversation's updatedAt
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }
  }

  try {
    const genai = getGenAI();

    // Use streaming API
    const stream = await genai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [FILE_SEARCH_STORE_NAME],
            },
          },
        ],
      },
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const citations: Citation[] = [];
    let fullResponse = "";
    const isFirstMessage = history.length === 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Extract text from chunk
            const text =
              chunk.candidates?.[0]?.content?.parts
                ?.map((part) => part.text)
                .join("") || "";

            if (text) {
              fullResponse += text;
              // Send text chunk as SSE
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: text })}\n\n`
                )
              );
            }

            // Check for grounding metadata (usually in final chunk)
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
              groundingMetadata.groundingChunks.forEach((grChunk, index) => {
                if (grChunk.retrievedContext) {
                  citations.push({
                    id: index + 1,
                    sourceTitle:
                      grChunk.retrievedContext.title || "Unknown Source",
                    sourceUri: grChunk.retrievedContext.uri,
                    text: grChunk.retrievedContext.text || "",
                  });
                }
              });
            }
          }

          // Send citations at the end
          if (citations.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
              )
            );
          }

          // Save assistant message to database
          if (userId && conversationId && fullResponse) {
            await db.insert(messages).values({
              conversationId,
              role: "assistant",
              content: fullResponse,
              citations: citations.length > 0 ? citations : null,
            });

            // Generate title after first message exchange
            if (isFirstMessage) {
              try {
                const title = await generateTitle(message, fullResponse);
                await db
                  .update(conversations)
                  .set({ title, updatedAt: new Date() })
                  .where(eq(conversations.id, conversationId));

                // Send the new title to the client
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "title", title })}\n\n`
                  )
                );
              } catch (titleError) {
                console.error("Failed to generate title:", titleError);
              }
            }
          }

          // Send done signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Streaming failed" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
