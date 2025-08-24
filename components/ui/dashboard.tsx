"use client";

import { Building, Search, Clock, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { KPIDashboard } from "./kpi-dashboard";
import { CompanyDetails } from "./company-details";
import { ResumeViewer } from "./resume-viewer";
import { useContactResults } from "../../hooks/useContactResults";
import { ContactResult } from "../../types";
import { useState } from "react";

interface DashboardProps {
  onStartResearch: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToEmailHistory?: () => void;
  onNavigateToLinkedInHistory?: () => void;
  onResumeUploadClick?: () => void;
  onResumeSettingsChange?: (useResume: boolean, content: string | null) => void;
  showResumeViewer?: boolean;
  resumeRefreshTrigger?: number;
  onResumeDeleted?: () => void;
  parentResumeState?: { // Pass parent resume state for sync
    useInPersonalization: boolean;
    filename?: string;
  } | null;
}

export function Dashboard({ 
  onStartResearch, 
  onNavigateToAnalytics, 
  onNavigateToEmailHistory, 
  onNavigateToLinkedInHistory,
  onResumeUploadClick,
  onResumeSettingsChange,
  showResumeViewer = false,
  resumeRefreshTrigger,
  onResumeDeleted,
  parentResumeState
}: DashboardProps) {
  const { contactResults, loading, error } = useContactResults();
  const [selectedCompany, setSelectedCompany] = useState<ContactResult | null>(null);

  const formatDate = (dateString: string, updatedString?: string) => {
    const date = new Date(dateString);
    const updated = updatedString ? new Date(updatedString) : null;
    const now = new Date();
    
    // Use updated date if it's different from created date (indicating an update)
    const displayDate = updated && Math.abs(updated.getTime() - date.getTime()) > 1000 ? updated : date;
    const isUpdated = updated && Math.abs(updated.getTime() - date.getTime()) > 1000;
    
    const diffMs = now.getTime() - displayDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeText = '';
    if (diffHours < 1) timeText = 'Just now';
    else if (diffHours < 24) timeText = `${diffHours}h ago`;
    else if (diffDays < 7) timeText = `${diffDays}d ago`;
    else timeText = displayDate.toLocaleDateString();
    
    return { timeText, isUpdated };
  };

  if (selectedCompany) {
    return (
      <CompanyDetails 
        company={selectedCompany} 
        onClose={() => setSelectedCompany(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4 sm:pt-6">
                <div className="h-12 sm:h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = contactResults.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <KPIDashboard />
        
        {/* New User Onboarding */}
        <div className="text-center py-12 sm:py-20 px-4">
          <div className="max-w-sm sm:max-w-md mx-auto">
            <div className="mb-6 sm:mb-8">
              <Sparkles className="h-16 w-16 sm:h-20 sm:w-20 text-blue-500 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3 sm:mb-4">
                Welcome to Outreach
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Start your AI-powered outreach journey. Research companies, find contacts, and generate personalized messages in seconds.
              </p>
            </div>
            
            <Button
              onClick={onStartResearch}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
              Start Research
            </Button>
            
            <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-slate-500 space-y-1">
              <p>✨ AI-powered company research</p>
              <p>📧 Personalized cold emails</p>
              <p>💼 LinkedIn message generation</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <KPIDashboard />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Searched Companies - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                Searched Companies ({contactResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
                {contactResults.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base text-slate-900 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="truncate">{company.company_name}</span>
                        {(() => {
                          // Display research quality indicator from research data
                          const confidenceLevel = company.research_data?.confidence_assessment?.level;
                          const confidenceScore = company.confidence_score;
                          
                          if (confidenceLevel) {
                            const getBadgeStyles = (level: string) => {
                              switch (level.toLowerCase()) {
                                case 'high':
                                  return 'bg-green-100 text-green-800 border-green-200';
                                case 'medium':
                                  return 'bg-blue-100 text-blue-800 border-blue-200';
                                case 'low':
                                  return 'bg-amber-100 text-amber-800 border-amber-200';
                                default:
                                  return 'bg-gray-100 text-gray-800 border-gray-200';
                              }
                            };
                            
                            const getDisplayText = (level: string) => {
                              switch (level.toLowerCase()) {
                                case 'high':
                                  return 'Rich Data';
                                case 'medium':
                                  return 'Good Data';
                                case 'low':
                                  return 'Basic Data';
                                default:
                                  return 'Unknown';
                              }
                            };
                            
                            return (
                              <span 
                                className={`text-xs px-2 py-1 rounded border self-start ${getBadgeStyles(confidenceLevel)}`}
                                title={`Research quality: ${confidenceLevel}. This indicates how much information was found about the company.`}
                              >
                                {getDisplayText(confidenceLevel)}
                              </span>
                            );
                          } else if (confidenceScore && confidenceScore < 0.7) {
                            return (
                              <span 
                                className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded self-start"
                                title="Limited information was found about this company"
                              >
                                Limited Data
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {(() => {
                        // Check for contact information - prioritize primary, fallback to secondary
                        let contactName = company.contact_name;
                        let contactTitle = company.contact_title;
                        let contactType = 'Contact';
                        
                        // Helper function to check if a value is valid (not N/A, empty, etc.)
                        const isValidValue = (value: string | null | undefined) => {
                          if (!value || value.trim() === '') return false;
                          if (value === "N/A" || value === "n/a") return false;
                          if (value.toLowerCase().includes("not available")) return false;
                          return true;
                        };
                        
                        // If no valid primary contact stored but we have research_data, check for contacts
                        if (!isValidValue(contactName) && company.research_data?.contact) {
                          const contactData = company.research_data.contact;
                          
                          // Check for primary contact first
                          if (contactData.primary_contact && isValidValue(contactData.primary_contact.name)) {
                            contactName = contactData.primary_contact.name;
                            contactTitle = contactData.primary_contact.title;
                            contactType = contactData.primary_contact.contact_type === 'hiring' ? 'Hiring Contact' : 'Primary Contact';
                          }
                          // Fall back to secondary contact
                          else if (contactData.secondary_contact && isValidValue(contactData.secondary_contact.name)) {
                            contactName = contactData.secondary_contact.name;
                            contactTitle = contactData.secondary_contact.title;
                            contactType = contactData.secondary_contact.contact_type === 'leadership' ? 'Leadership Contact' : 'Secondary Contact';
                          }
                          // Handle legacy single contact structure
                          else if (isValidValue(contactData.name)) {
                            contactName = contactData.name;
                            contactTitle = contactData.title;
                            contactType = 'Contact';
                          }
                        }
                        
                        if (isValidValue(contactName)) {
                          return (
                            <div className="text-sm text-slate-600">
                              {contactName} • {contactTitle || 'Title not available'}
                              <span className="ml-2 text-xs text-slate-500">({contactType})</span>
                              {company.confidence_score && (
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  company.confidence_score >= 0.8 ? 'bg-green-100 text-green-800' :
                                  company.confidence_score >= 0.7 ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}
                                title={`Contact quality: ${
                                  company.confidence_score >= 0.8 ? 'High-quality contact information found' :
                                  company.confidence_score >= 0.7 ? 'Good contact information found' : 
                                  'Basic contact information found'
                                }`}>
                                  {company.confidence_score >= 0.8 ? 'Verified Contact' :
                                   company.confidence_score >= 0.7 ? 'Good Contact' : 'Basic Contact'}
                                </span>
                              )}
                            </div>
                          );
                        } else {
                          // No contact found at all
                          return (
                            <div className="text-sm text-slate-500 italic">
                              Direct contact not found • Try company website or LinkedIn
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      {(() => {
                        const { timeText, isUpdated } = formatDate(company.created_at, company.updated_at);
                        return (
                          <span className="flex items-center gap-1">
                            {timeText}
                            {isUpdated && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                Updated
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Takes 1 column */}
        <div className="space-y-4">
          {/* Resume Viewer */}
          {showResumeViewer && onResumeUploadClick && (
            <ResumeViewer
              key="resume-viewer" // Ensure component remounts when needed
              onUploadClick={onResumeUploadClick}
              onResumeSettingsChange={onResumeSettingsChange}
              refreshTrigger={resumeRefreshTrigger}
              onResumeDeleted={onResumeDeleted}
              parentResumeState={parentResumeState}
            />
          )}

          {/* Quick Actions */}
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={onStartResearch}
                  className="justify-start h-9"
                  variant="outline"
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Research New Company
                </Button>
                <Button
                  onClick={onNavigateToAnalytics}
                  className="justify-start h-9"
                  variant="ghost"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button
                  onClick={onNavigateToEmailHistory}
                  className="justify-start h-9"
                  variant="ghost"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Email History
                </Button>
                <Button
                  onClick={onNavigateToLinkedInHistory}
                  className="justify-start h-9"
                  variant="ghost"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  LinkedIn History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}