import type { AnalysisStatus } from './resumes.constants'; 

export type UploadResumeResponse = {
    resumeId: string;
    analysisId: string;
    status: 'pending';
};

export type ResumeListItem = {
    id: string;
    file_name: string;
    file_url: string;
    uploaded_at: string; 
    is_active: boolean;
};

export type ScoreBreakdownItem = {
    category: string;
    label: string;
    score: number;
    max_score: number;
};

export type ExtractedSkills = {
    languages: string[];
    frameworks: string[];
    databases: string[];
    cloud: string[];
    data_ml: string[];
    other: string[];
};

export type AnalysisSuggestion = {
    suggestion: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
};

/**OpenAI -. API DIO (section 1.2) */

export type AnalysisResultDto = {
    ats_score : {
        total_score: number; 
        grade: string;
        breakdown: ScoreBreakdownItem[];
    };
    extracted_skills: ExtractedSkills;
    summary:string;
    strengths: string[];
    suggestions: AnalysisSuggestion[];
    issues_identified: string[];
};

export type AnalysisResponse = {
    analysisId: string;
    resumeID: string;
    status: AnalysisStatus;
    srror_message?: string | null;
    result?: AnalysisResultDto | null;
}
