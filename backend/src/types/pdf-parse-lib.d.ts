/**
 * Type declaration for the internal pdf-parse entrypoint.
 *
 * We import `pdf-parse/lib/pdf-parse.js` directly instead of the package root
 * to avoid the library's "debug mode" block, which attempts to read a bundled
 * sample PDF from disk when it thinks it's being run as a script.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export default pdfParse;
}
