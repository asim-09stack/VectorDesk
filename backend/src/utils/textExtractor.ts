import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { BadRequestError } from '@/utils/errors';

/**
 * Normalize extracted text: collapse excessive whitespace and blank lines
 * while preserving paragraph boundaries. Cleaner text → cleaner chunks →
 * better embeddings.
 */
const normalizeText = (raw: string): string =>
  raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Extract plain text from a supported document on disk.
 *
 * Supported: PDF (.pdf), Word (.docx), plain text (.txt).
 *
 * @param filePath - Absolute path to the uploaded file.
 * @param mimeType - MIME type reported at upload time (used as a hint).
 * @returns The normalized, extracted text content.
 * @throws {BadRequestError} for unsupported types or empty documents.
 */
export const extractText = async (
  filePath: string,
  mimeType: string,
): Promise<string> => {
  const ext = path.extname(filePath).toLowerCase();

  let text = '';

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    text = value;
  } else if (mimeType === 'text/plain' || ext === '.txt') {
    text = await fs.readFile(filePath, 'utf-8');
  } else {
    throw new BadRequestError(`Cannot extract text from file type: ${ext}`);
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    throw new BadRequestError(
      'No readable text could be extracted from this document',
    );
  }
  return normalized;
};
