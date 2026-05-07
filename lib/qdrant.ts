import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = process.env.QDRANT_COLLECTION || "notebook-llm";
const VECTOR_SIZE = 3072; // text-embedding-3-large

let cached: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (cached) return cached;
  cached = new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!
  });
  return cached;
}

export function getCollectionName(): string {
  return COLLECTION;
}

export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();
  const list = await client.getCollections();
  if (list.collections.some(c => c.name === COLLECTION)) return;
  await client.createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" }
  });
  await client.createPayloadIndex(COLLECTION, {
    field_name: "sessionId",
    field_schema: "keyword"
  });
  await client.createPayloadIndex(COLLECTION, {
    field_name: "docId",
    field_schema: "keyword"
  });
}
