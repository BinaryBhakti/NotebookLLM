export type Citation = {
  fileName: string;
  page: number | null;
  snippet: string;
  chunkIndex: number;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
};

export type DocumentSummary = {
  docId: string;
  fileName: string;
  chunkCount: number;
};

export type ChunkMetadata = {
  sessionId: string;
  docId: string;
  fileName: string;
  page: number | null;
  chunkIndex: number;
};
