import { GoogleGenAI } from "@google/genai";

let _genai: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!_genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    _genai = new GoogleGenAI({ apiKey });
  }
  return _genai;
}

export const FILE_SEARCH_STORE_NAME =
  process.env.FILE_SEARCH_STORE_NAME || "atlas-store";
