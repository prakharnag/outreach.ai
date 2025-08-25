import { supabase } from "./supabase";

export interface ResumeData {
  url: string;
  filename: string;
  content: string;
  useInPersonalization: boolean;
}

/**
 * Fetches user's resume data from their profile
 * Automatically regenerates expired signed URLs
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

    // Check if the signed URL is still valid
    console.log('Checking resume URL validity for:', data.resume_filename);
    const isValid = await isSignedUrlValid(data.resume_url);
    console.log('URL validation result:', isValid);
    
    if (!isValid) {
      console.log('Resume signed URL expired, regenerating...');
      const newUrl = await regenerateResumeSignedUrl(userId, data.resume_filename);
      if (newUrl) {
        console.log('Successfully regenerated URL');
        data.resume_url = newUrl;
      } else {
        console.error('Failed to regenerate signed URL');
        return null;
      }
    } else {
      console.log('Resume URL is still valid');
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
 * Uses a more robust approach with timeout and proper error handling
 */
export async function isSignedUrlValid(url: string): Promise<boolean> {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Check for successful response or access forbidden (which might indicate the file exists but is protected)
    return response.ok || response.status === 403;
  } catch (error) {
    // If the request fails (network error, timeout, or CORS), assume URL is invalid
    console.log('URL validation failed:', error);
    return false;
  }
}

/**
 * Regenerates a signed URL for a resume file and updates the database
 */
export async function regenerateResumeSignedUrl(userId: string, filename: string): Promise<string | null> {
  try {
    // Handle both old format (userId_timestamp.ext) and new format (userId/timestamp.ext)
    let storedFileName;
    if (filename.includes('/')) {
      // New format: already has folder structure
      storedFileName = filename;
    } else if (filename.includes('_')) {
      // Old format: convert to new folder structure
      const parts = filename.split('_');
      if (parts.length >= 2) {
        storedFileName = `${userId}/${parts.slice(1).join('_')}`;
      } else {
        storedFileName = `${userId}/${filename}`;
      }
    } else {
      // Fallback: assume it's just the filename
      storedFileName = `${userId}/${filename}`;
    }

    console.log(`Attempting to regenerate signed URL for: ${storedFileName}`);

    const { data: signedData, error: signedError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(storedFileName, 3600); // 1 hour

    if (signedError) {
      console.error('Failed to regenerate signed URL:', signedError);
      
      // If file not found, try to recover by finding existing files
      if (signedError.message?.includes('Object not found')) {
        console.log('File not found, attempting recovery...');
        const recoveredUrl = await findAndRecoverResumeFile(userId, filename);
        if (recoveredUrl) {
          return recoveredUrl;
        }
      }
      
      return null;
    }

    // Update the URL in the database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ resume_url: signedData.signedUrl })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update signed URL in database:', updateError);
      return null;
    }

    console.log('Successfully regenerated signed URL for resume');
    return signedData.signedUrl;
  } catch (error) {
    console.error('Error regenerating signed URL:', error);
    return null;
  }
}

/**
 * Lists all resume files for a user to help with recovery
 */
export async function listUserResumeFiles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from('resumes')
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing resume files:', error);
      return [];
    }

    return data?.map((file: any) => `${userId}/${file.name}`) || [];
  } catch (error) {
    console.error('Error listing resume files:', error);
    return [];
  }
}

/**
 * Attempts to find and recover a resume file by searching for similar files
 */
async function findAndRecoverResumeFile(userId: string, originalFilename: string): Promise<string | null> {
  try {
    console.log(`Searching for alternative resume files for user: ${userId}`);
    
    // List all files in the user's folder
    const existingFiles = await listUserResumeFiles(userId);
    console.log('Found existing files:', existingFiles);
    
    if (existingFiles.length === 0) {
      console.log('No resume files found in storage for this user');
      return null;
    }

    // Try to find a file with similar name or just use the most recent one
    const originalName = originalFilename.toLowerCase();
    let bestMatch = existingFiles[0]; // Default to most recent
    
    // Look for exact or similar name match
    for (const file of existingFiles) {
      const fileName = file.split('/').pop()?.toLowerCase() || '';
      if (fileName.includes(originalName.replace('.pdf', '')) || originalName.includes(fileName.replace('.pdf', ''))) {
        bestMatch = file;
        break;
      }
    }
    
    console.log(`Selected file for recovery: ${bestMatch}`);
    
    // Generate a new signed URL for the found file
    const { data: signedData, error: signedError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(bestMatch, 3600);

    if (signedError) {
      console.error('Failed to create signed URL for recovered file:', signedError);
      return null;
    }

    // Update the database with the correct file reference
    // Keep the original user-friendly filename, only update the URL
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        resume_url: signedData.signedUrl
        // Don't update resume_filename - keep the original user-friendly name
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update database with recovered file:', updateError);
      return null;
    }

    console.log(`Successfully recovered resume file, keeping original filename: ${originalFilename}`);
    return signedData.signedUrl;
  } catch (error) {
    console.error('Error during file recovery:', error);
    return null;
  }
}
