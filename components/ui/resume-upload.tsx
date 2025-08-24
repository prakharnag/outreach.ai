"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Alert, AlertDescription } from "./alert";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { useToast } from "./toast";

interface ResumeUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (resumeData: {
    url: string;
    filename: string;
    content: string;
  }) => void;
  className?: string;
}

export function ResumeUpload({ isOpen, onClose, onUploadSuccess, className }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // For PDF text extraction, we'll use a simple approach
    // In a production environment, you might want to use PDF.js or send to a server
    try {
      console.log('[Resume Upload] Starting PDF text extraction for:', file.name);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[Resume Upload] Extract text API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Resume Upload] Extract text API error:', errorData);
        throw new Error('Failed to extract text from PDF');
      }
      
      const { text } = await response.json();
      console.log('[Resume Upload] Successfully extracted text, length:', text.length);
      console.log('[Resume Upload] Text preview:', text.slice(0, 200) + '...');
      return text;
    } catch (error) {
      console.error('[Resume Upload] PDF text extraction failed:', error);
      // Fallback to filename-based content
      return `Resume file: ${file.name}`;
    }
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    // For DOCX text extraction, we'll use a simple approach
    // In a production environment, you might want to use mammoth.js or send to a server
    try {
      console.log('[Resume Upload] Starting DOCX text extraction for:', file.name);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      console.log('[Resume Upload] Extract text API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[Resume Upload] Extract text API error:', errorData);
        throw new Error('Failed to extract text from DOCX');
      }
      
      const { text } = await response.json();
      console.log('[Resume Upload] Successfully extracted text, length:', text.length);
      console.log('[Resume Upload] Text preview:', text.slice(0, 200) + '...');
      return text;
    } catch (error) {
      console.error('[Resume Upload] DOCX text extraction failed:', error);
      // Fallback to filename-based content
      return `Resume file: ${file.name}`;
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type
    if (!supportedTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document (.pdf, .docx, .doc)');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Generate unique filename with folder structure for RLS
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Generate signed URL (expires in 1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(fileName, 3600); // 1 hour

      if (signedError) {
        throw new Error(`Failed to generate signed URL: ${signedError.message}`);
      }

      // Extract text content based on file type
      let textContent = '';
      if (file.type === 'application/pdf') {
        textContent = await extractTextFromPDF(file);
      } else if (file.type.includes('word') || file.type.includes('document')) {
        textContent = await extractTextFromDocx(file);
      } else {
        textContent = `Resume file: ${file.name}`;
      }

      // Save to user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          resume_url: signedData.signedUrl,
          resume_filename: file.name,
          resume_content: textContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      showToast({
        type: "success",
        message: "Resume uploaded successfully!"
      });

      onUploadSuccess({
        url: signedData.signedUrl,
        filename: file.name,
        content: textContent
      });

      onClose();

    } catch (error: any) {
      console.error('Resume upload error:', error);
      setError(error.message || 'Failed to upload resume');
      showToast({
        type: "error",
        message: `Upload failed: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Upload Resume</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
              isDragging 
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg scale-105" 
                : "border-slate-300 bg-gradient-to-br from-slate-50 to-white hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-slate-50 shadow-sm hover:shadow-md",
              uploading && "pointer-events-none opacity-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 relative z-10" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Uploading resume...</p>
                  <p className="text-xs text-slate-500 mt-1">This may take a moment</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "relative rounded-full p-4 transition-all duration-200",
                  isDragging 
                    ? "bg-gradient-to-br from-blue-100 to-blue-200 scale-110" 
                    : "bg-gradient-to-br from-slate-100 to-slate-200 hover:from-blue-50 hover:to-blue-100"
                )}>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/50 to-transparent"></div>
                  {isDragging ? (
                    <Upload className="h-8 w-8 text-blue-600 relative z-10" />
                  ) : (
                    <FileText className="h-8 w-8 text-slate-500 hover:text-blue-500 transition-colors duration-200 relative z-10" />
                  )}
                </div>
                <div className="text-center space-y-2">
                  <p className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isDragging ? "text-blue-700" : "text-slate-700"
                  )}>
                    {isDragging ? "Drop your resume here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full inline-block">
                    PDF, DOC, or DOCX up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
            <div className="text-xs text-blue-700 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <p className="flex-1">Your resume will be used to personalize outreach messages</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <p className="flex-1">File is securely stored and only accessible to you</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <p className="flex-1">You can toggle resume usage on/off in message generation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
