import { supabase } from "./supabase";

export interface ResumeData {
  url: string;
  filename: string;
  content: string;
  useInPersonalization: boolean;
}

/**
 * Fetches user's resume data from their profile
 */
export async function getUserResumeData(userId: string): Promise<ResumeData | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('resume_url, resume_filename, resume_content, use_resume_in_personalization')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error loading user resume data:', error);
      return null;
    }

    if (!data || !data.resume_url || !data.resume_content) {
      return null;
    }

    return {
      url: data.resume_url,
      filename: data.resume_filename || 'resume',
      content: data.resume_content,
      useInPersonalization: data.use_resume_in_personalization || false
    };
  } catch (error) {
    console.error('Error fetching resume data:', error);
    return null;
  }
}

/**
 * Formats resume content for use in messaging generation
 * Truncates and cleans the content to optimize AI processing
 */
export function formatResumeForMessaging(resumeContent: string): string {
  if (!resumeContent || resumeContent.trim().length === 0) {
    return '';
  }

  // Clean the content
  let cleanedContent = resumeContent
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();

  // Truncate to reasonable length for AI processing (max 2000 chars)
  if (cleanedContent.length > 2000) {
    cleanedContent = cleanedContent.substring(0, 2000) + '...';
  }

  return cleanedContent;
}

/**
 * Validates if a resume file is supported
 */
export function isValidResumeFile(file: File): { valid: boolean; error?: string } {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown'
  ];
  
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a PDF, Word document, or text file (.pdf, .docx, .doc, .txt, .md)'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 5MB'
    };
  }

  return { valid: true };
}

/**
 * Extracts the file extension from a filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Generates a unique filename for storage
 */
export function generateUniqueFilename(userId: string, originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const timestamp = Date.now();
  return `${userId}/${timestamp}.${extension}`;
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Checks if a signed URL is still valid by attempting to fetch it
 */
export async function isSignedUrlValid(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
