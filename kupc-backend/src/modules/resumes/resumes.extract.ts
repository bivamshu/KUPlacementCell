import { PDFParse } from 'pdf-parse';
import { env } from '../../config/env';
import { ResumeEmptyTextError } from './resumes.errors';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text.replace(/\s+/g, ' ').trim();

    if (text.length < env.RESUME_MIN_EXTRACT_CHARS) {
      throw new ResumeEmptyTextError();
    }

    return text;
  } catch (error) {
    if (error instanceof ResumeEmptyTextError) {
      throw error;
    }

    throw new ResumeEmptyTextError('Could not parse PDF or extract text');
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
