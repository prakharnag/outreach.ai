"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { FileText, X, Upload, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { useToast } from "./toast";

interface ResumeViewerProps {
  className?: string;
  onUploadClick: () => void;
  onResumeSettingsChange?: (useResume: boolean, content: string | null) => void;
  onResumeDeleted?: () => void; // Add delete callback
  refreshTrigger?: number; // Add refresh trigger prop
  parentResumeState?: { // Add parent state for sync
    useInPersonalization: boolean;
    filename?: string;
  } | null;
}

interface ResumeData {
  url: string;
  filename: string;
  content: string;
  useInPersonalization: boolean;
}

export function ResumeViewer({ 
  className, 
  onUploadClick, 
  onResumeSettingsChange, 
  onResumeDeleted,
  refreshTrigger,
  parentResumeState 
}: ResumeViewerProps) {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  // Load resume data on mount and when refresh trigger changes
  useEffect(() => {
    loadUserProfile();
  }, [refreshTrigger]);

  // Sync with parent state when it changes
  useEffect(() => {
    if (parentResumeState && resumeData) {
      // Update local state to match parent state
      setResumeData(prev => prev ? {
        ...prev,
        useInPersonalization: parentResumeState.useInPersonalization
      } : null);
    }
  }, [parentResumeState]);

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('resume_url, resume_filename, resume_original_filename, resume_content, use_resume_in_personalization')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user profile:', error);
        setLoading(false);
        return;
      }

      if (data && data.resume_filename) {
        // Generate a fresh signed URL from the stored file path
        const freshUrl = await generateFreshSignedUrl(data.resume_filename);
        
        if (freshUrl) {
          setResumeData({
            url: freshUrl,
            filename: data.resume_original_filename || data.resume_filename.split('/').pop() || data.resume_filename, // Use original filename if available
            content: data.resume_content,
            useInPersonalization: data.use_resume_in_personalization || false
          });
          
          // Notify parent component of the loaded resume settings
          if (onResumeSettingsChange) {
            onResumeSettingsChange(
              data.use_resume_in_personalization || false, 
              data.resume_content || null
            );
          }
        } else {
          // File not found, clean up
          console.log('Resume file not found, cleaning up database record...');
          await cleanupOrphanedResume();
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFreshSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // First check if the file exists in storage
      const fileExists = await checkFileExists(filePath);
      if (!fileExists) {
        console.log('File not found in storage:', filePath);
        return null;
      }

      // Generate a fresh signed URL (1 year expiration)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 31536000); // 1 year

      if (signedError) {
        console.error('Failed to generate fresh signed URL:', signedError);
        return null;
      }

      return signedData.signedUrl;
    } catch (error) {
      console.error('Error generating fresh signed URL:', error);
      return null;
    }
  };

  const regenerateSignedUrl = async (filename: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Handle both old format (userId_timestamp.ext) and new format (userId/timestamp.ext)
      let storedFileName;
      if (filename.includes('/')) {
        // New format: already has folder structure
        storedFileName = filename;
      } else if (filename.includes('_')) {
        // Old format: convert to new folder structure
        const parts = filename.split('_');
        if (parts.length >= 2) {
          storedFileName = `${user.id}/${parts.slice(1).join('_')}`;
        } else {
          storedFileName = `${user.id}/${filename}`;
        }
      } else {
        // Fallback: assume it's just the filename
        storedFileName = `${user.id}/${filename}`;
      }

      console.log('Attempting to regenerate URL for file:', storedFileName);

      // Generate fresh signed URL
      const freshUrl = await generateFreshSignedUrl(storedFileName);
      
      if (freshUrl) {
        // Update local state with fresh URL
        setResumeData(prev => prev ? {
          ...prev,
          url: freshUrl
        } : null);

        console.log('Resume URL regenerated successfully');
      } else {
        console.log('File not found in storage, cleaning up database record...');
        await cleanupOrphanedResume();
      }
    } catch (error) {
      console.error('Error regenerating signed URL:', error);
    }
  };

  const checkFileExists = async (fileName: string): Promise<boolean> => {
    try {
      // Try to get file metadata directly
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(fileName);

      if (error) {
        console.log('File not found in storage:', error.message);
        return false;
      }

      return data !== null;
    } catch (error) {
      console.log('Error checking file existence:', error);
      return false;
    }
  };

  const cleanupOrphanedResume = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear the orphaned resume data from the database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          resume_url: null,
          resume_filename: null,
          resume_content: null,
          use_resume_in_personalization: false
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to cleanup orphaned resume:', error);
        return;
      }

      // Clear the local state
      setResumeData(null);
      
      // Notify parent component
      if (onResumeSettingsChange) {
        onResumeSettingsChange(false, null);
      }

      showToast({
        type: "info",
        message: "Resume file was not found and has been removed from your profile"
      });

      console.log('Orphaned resume data cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up orphaned resume:', error);
    }
  };

  const toggleResumeUsage = async () => {
    if (!resumeData || updating) return;

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !resumeData.useInPersonalization;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ use_resume_in_personalization: newValue })
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      setResumeData(prev => prev ? { ...prev, useInPersonalization: newValue } : null);
      
      // Notify parent component of the change
      if (onResumeSettingsChange) {
        onResumeSettingsChange(newValue, resumeData?.content || null);
      }
      
      showToast({
        type: "success",
        message: `Resume ${newValue ? 'enabled' : 'disabled'} for personalization`
      });
    } catch (error: any) {
      console.error('Error updating resume usage:', error);
      showToast({
        type: "error",
        message: `Failed to update setting: ${error.message}`
      });
    } finally {
      setUpdating(false);
    }
  };

  const deleteResume = async () => {
    if (!resumeData || deleting) return;

    if (!confirm('Are you sure you want to delete your resume? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete from storage - handle both old and new file naming formats
      let fileName;
      if (resumeData.filename.includes('/')) {
        // New format: already has folder structure
        fileName = resumeData.filename;
      } else if (resumeData.filename.includes('_')) {
        // Old format: convert to new folder structure
        const parts = resumeData.filename.split('_');
        if (parts.length >= 2) {
          fileName = `${user.id}/${parts.slice(1).join('_')}`;
        } else {
          fileName = `${user.id}/${resumeData.filename}`;
        }
      } else {
        // Fallback: assume it's just the filename
        fileName = `${user.id}/${resumeData.filename}`;
      }

      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([fileName]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Clear from user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          resume_url: null,
          resume_filename: null,
          resume_content: null,
          use_resume_in_personalization: false
        })
        .eq('user_id', user.id);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setResumeData(null);
      showToast({
        type: "success",
        message: "Resume deleted successfully"
      });
      
      // Notify parent component of deletion
      if (onResumeDeleted) {
        onResumeDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting resume:', error);
      showToast({
        type: "error",
        message: `Failed to delete resume: ${error.message}`
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Function to refresh resume data (called from parent after upload)
  const refreshResumeData = (newResumeData: {
    url: string;
    filename: string;
    content: string;
  }) => {
    setResumeData({
      ...newResumeData,
      useInPersonalization: false // Default to false for new uploads
    });
  };

  // Expose refresh function to parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshResumeViewer = refreshResumeData;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).refreshResumeViewer;
      }
    };
  }, []);

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Resume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resumeData) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Resume</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-slate-100 p-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-1">No resume uploaded</h3>
              <p className="text-sm text-slate-500 mb-4">
                Upload your resume to personalize outreach messages
              </p>
              <Button onClick={onUploadClick} size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Resume
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Resume</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleResumeUsage}
              disabled={updating}
              className="h-8 px-2 gap-2"
              title={`${resumeData.useInPersonalization ? 'Disable' : 'Enable'} resume in personalization`}
            >
              {resumeData.useInPersonalization ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-xs">
                {resumeData.useInPersonalization ? 'ON' : 'OFF'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteResume}
              disabled={deleting}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete resume"
            >
              {deleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{resumeData.filename}</p>
            <p className="text-xs text-slate-500">
              {resumeData.useInPersonalization 
                ? "✓ Used in personalization" 
                : "Not used in personalization"
              }
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Content Preview</h4>
          <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 leading-relaxed">
              {resumeData.content.length > 300 
                ? `${resumeData.content.substring(0, 300)}...` 
                : resumeData.content
              }
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="flex-1 gap-2"
          >
            <Upload className="h-4 w-4" />
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(resumeData.url, '_blank')}
            className="flex-1 gap-2"
          >
            <FileText className="h-4 w-4" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export the refresh function for external use
export const refreshResumeViewer = (newResumeData: {
  url: string;
  filename: string;
  content: string;
}) => {
  if (typeof window !== 'undefined' && (window as any).refreshResumeViewer) {
    (window as any).refreshResumeViewer(newResumeData);
  }
};
