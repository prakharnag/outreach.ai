export interface ContactResult {
  id: string;
  user_id: string;
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  email_inferred: boolean;
  confidence_score?: number;
  source_url?: string;
  source_title?: string;
  research_data?: any;
  created_at: string;
  updated_at: string;
}

export interface EmailHistory {
  id: string;
  company_name: string;
  role: string;
  subject_line: string;
  content: string;
  created_at: string;
}

export interface LinkedInHistory {
  id: string;
  company_name: string;
  role: string;
  content: string;
  created_at: string;
}