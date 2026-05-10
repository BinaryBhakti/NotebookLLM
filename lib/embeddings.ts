import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const MODEL = "gemini-embedding-001";
const OUTPUT_DIM = 768;

let cached: GoogleGenerativeAI | null = null;
function client(): GoogleGenerativeAI {
  if (cached) return cached;
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  cached = new GoogleGenerativeAI(key);
  return cached;
}

async function batchEmbed(texts: string[], taskType: TaskType): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = client().getGenerativeModel({ model: MODEL });
  const result = await model.batchEmbedContents({
    requests: texts.map(text => ({
      content: { role: "user", parts: [{ text }] },
      taskType,
      outputDimensionality: OUTPUT_DIM
    }))
  });
  return result.embeddings.map(e => e.values);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  return batchEmbed(texts, TaskType.RETRIEVAL_DOCUMENT);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await batchEmbed([text], TaskType.RETRIEVAL_QUERY);
  return v;
}
