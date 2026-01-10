import { getGenAI, FILE_SEARCH_STORE_NAME } from "@/lib/gemini";
import { Message, Citation } from "@/lib/types";

export const runtime = "nodejs";

interface ChatRequest {
  message: string;
  history: Message[];
}

export async function POST(request: Request) {
  const { message, history }: ChatRequest = await request.json();

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
    let citations: Citation[] = [];

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Extract text from chunk
            const text = chunk.candidates?.[0]?.content?.parts
              ?.map((part) => part.text)
              .join("") || "";

            if (text) {
              // Send text chunk as SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`)
              );
            }

            // Check for grounding metadata (usually in final chunk)
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
              groundingMetadata.groundingChunks.forEach((grChunk, index) => {
                if (grChunk.retrievedContext) {
                  citations.push({
                    id: index + 1,
                    sourceTitle: grChunk.retrievedContext.title || "Unknown Source",
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
              encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`)
            );
          }

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Streaming failed" })}\n\n`)
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
