/** Roles supported by the application. */
export type UserRole = 'ADMIN' | 'USER';

/** Authenticated user's public profile. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

/** Payload returned by register/login endpoints. */
export interface AuthResult {
  user: User;
  token: string;
}

/** Standard API success envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

/** Document lifecycle status (mirrors the backend enum). */
export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';

/** A knowledge-base document as shown in the admin UI. */
export interface Document {
  id: string;
  filename: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  chunkCount: number;
  error?: string | null;
  createdAt: string;
}

/** A retrieved source shown alongside an assistant answer. */
export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  text: string;
  score: number;
}

/** Chat conversation summary (sidebar list item). */
export interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Message author roles. */
export type MessageRole = 'user' | 'assistant' | 'system';

/** A single chat message. */
export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  citations?: Citation[] | null;
  createdAt: string;
}
