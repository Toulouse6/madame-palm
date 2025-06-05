export type ReadingIssueType = 'blur' | 'partial' | 'fallback' | null;

export interface PalmReadingResponse {
    reading: string;
    readingWarning?: boolean;
    readingIssueType?: ReadingIssueType;
    cost?: string;
}

export interface PalmReadingRequest {
    base64: string;
    mimeType: string;
}
