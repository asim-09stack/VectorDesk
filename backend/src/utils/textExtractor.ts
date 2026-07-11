import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { BadRequestError } from '@/utils/errors';

/**
 * Normalize extracted text: strip characters that cannot be stored/used, then
 * collapse excessive whitespace and blank lines while preserving paragraph
 * boundaries. Cleaner text → cleaner chunks → better embeddings.
 *
 * Notably, PDF extraction frequently emits NUL bytes (0x00) and other
 * non-printable control characters. PostgreSQL's `text` type rejects NUL
 * bytes ("invalid byte sequence for encoding UTF8: 0x00"), so we remove them
 * (and other control chars) up front, keeping only tab and newline.
 */
const normalizeText = (raw: string): string =>
  raw
    .replace(/\r\n/g, '\n')
    // Remove NUL and C0/C1 control characters except tab (\t) and newline (\n).
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Drop the Unicode replacement char that often appears for undecodable glyphs.
    .replace(/\uFFFD/g, '')
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
