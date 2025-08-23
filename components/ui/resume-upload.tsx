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
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract text from PDF');
      }
      
      const { text } = await response.json();
      return text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      // Fallback to filename-based content
      return `Resume file: ${file.name}`;
    }
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    // For DOCX text extraction, we'll use a simple approach
    // In a production environment, you might want to use mammoth.js or send to a server
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract text from DOCX');
      }
      
      const { text } = await response.json();
      return text;
    } catch (error) {
      console.error('DOCX text extraction failed:', error);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
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
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Uploading resume...</p>
                <p className="text-xs text-slate-500">This may take a moment</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-slate-100 p-3">
                  {isDragging ? (
                    <Upload className="h-6 w-6 text-blue-500" />
                  ) : (
                    <FileText className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop your resume here" : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, DOC, or DOCX up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>• Your resume will be used to personalize outreach messages</p>
            <p>• File is securely stored and only accessible to you</p>
            <p>• You can toggle resume usage on/off in message generation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
