jest.mock('../config/env', () => ({
  env: {
    RESUME_MIN_EXTRACT_CHARS: 100
  }
}));

const mockGetText = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(undefined);

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy
  }))
}));

import { RESUME_ERROR_CODES } from '../modules/resumes/resumes.constants';
import { ResumeEmptyTextError } from '../modules/resumes/resumes.errors';
import { extractTextFromPdf } from '../modules/resumes/resumes.extract';

describe('Phase 4 Milestone 5 - PDF text extraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns trimmed text when PDF has enough content', async () => {
    mockGetText.mockResolvedValue({
      text: `${'Professional software engineer with experience in backend systems, APIs, databases, and cloud deployment. '.repeat(2)}Skills: Python, React, PostgreSQL, Docker.`
    });

    const text = await extractTextFromPdf(Buffer.from('%PDF-1.4'));

    expect(text.length).toBeGreaterThanOrEqual(100);
    expect(text).toContain('software engineer');
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('throws RESUME_EMPTY_TEXT when extracted text is too short', async () => {
    mockGetText.mockResolvedValue({ text: 'too short' });

    await expect(extractTextFromPdf(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({
      code: RESUME_ERROR_CODES.RESUME_EMPTY_TEXT
    });
  });

  it('throws RESUME_EMPTY_TEXT when pdf-parse fails', async () => {
    mockGetText.mockRejectedValue(new Error('corrupt pdf'));

    await expect(extractTextFromPdf(Buffer.from('%PDF-1.4'))).rejects.toBeInstanceOf(ResumeEmptyTextError);
  });
});
