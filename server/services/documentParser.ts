import fs from 'fs';
import path from 'path';

export interface ParsedDocument {
  name: string;
  type: string;
  size: number;
  content: string;
  isImage: boolean;
  pageCount?: number;
  wordCount?: number;
  truncated?: boolean;
}

const MAX_CHAR_LIMIT = 50000; // ~12k tokens, safe context budget for typical free models

export class DocumentParser {
  /**
   * Parse uploaded file buffer based on extension and mime type.
   */
  static async parseFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<ParsedDocument> {
    const ext = path.extname(originalName).toLowerCase();
    const isImage = mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);

    if (isImage) {
      // For images, format as base64 data URL
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType || 'image/png'};base64,${base64}`;
      return {
        name: originalName,
        type: mimeType,
        size: fileBuffer.length,
        content: dataUrl,
        isImage: true,
      };
    }

    let extractedText = '';
    let pageCount: number | undefined;

    try {
      if (ext === '.pdf' || mimeType === 'application/pdf') {
        try {
          // Dynamic import / require of pdf-parse
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || '';
          pageCount = pdfData.numpages;
        } catch (pdfErr: any) {
          console.warn('[PDF Parse Error]:', pdfErr.message);
          extractedText = `[Unable to parse full PDF structure: ${pdfErr.message}]`;
        }
      } else if (
        ext === '.docx' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        try {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value || '';
        } catch (docxErr: any) {
          console.warn('[DOCX Parse Error]:', docxErr.message);
          extractedText = `[Unable to parse DOCX structure: ${docxErr.message}]`;
        }
      } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
        try {
          const xlsx = await import('xlsx');
          const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
          const sheetNames = workbook.SheetNames;
          const sheetsText: string[] = [];

          for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = xlsx.utils.sheet_to_csv(sheet);
            sheetsText.push(`--- Sheet: ${sheetName} ---\n${csv}`);
          }
          extractedText = sheetsText.join('\n\n');
        } catch (xlsxErr: any) {
          console.warn('[Spreadsheet Parse Error]:', xlsxErr.message);
          extractedText = fileBuffer.toString('utf-8');
        }
      } else {
        // Plain text, Markdown, JSON, Code files (ts, js, py, html, css, etc.)
        extractedText = fileBuffer.toString('utf-8');
      }
    } catch (err: any) {
      console.error('[Document Parser Error]:', err);
      extractedText = `[Error parsing ${originalName}: ${err.message}]`;
    }

    // Clean up text
    extractedText = extractedText.replace(/\r\n/g, '\n').trim();

    // Check size & perform context-aware chunking/truncation if oversized
    let truncated = false;
    if (extractedText.length > MAX_CHAR_LIMIT) {
      truncated = true;
      const head = extractedText.substring(0, MAX_CHAR_LIMIT * 0.7);
      const tail = extractedText.substring(extractedText.length - MAX_CHAR_LIMIT * 0.3);
      extractedText = `${head}\n\n[... Truncated ${extractedText.length - MAX_CHAR_LIMIT} characters to fit context window ...]\n\n${tail}`;
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

    return {
      name: originalName,
      type: mimeType,
      size: fileBuffer.length,
      content: extractedText,
      isImage: false,
      pageCount,
      wordCount,
      truncated,
    };
  }
}

