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
    const response = await genai.models.generateContent({
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

    // Extract text content
    const text =
      response.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .join("") || "";

    // Extract citations from grounding metadata
    const citations: Citation[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk, index) => {
        if (chunk.retrievedContext) {
          citations.push({
            id: index + 1,
            sourceTitle: chunk.retrievedContext.title || "Unknown Source",
            sourceUri: chunk.retrievedContext.uri,
            text: chunk.retrievedContext.text || "",
          });
        }
      });
    }

    return Response.json({
      content: text,
      citations,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
