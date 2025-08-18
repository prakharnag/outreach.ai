"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { User, Mail, ExternalLink, Copy } from "lucide-react";
import { ResearchOutput } from "./research-output";

interface CompanyDetailsProps {
  company: {
    id: string;
    company_name: string;
    contact_name?: string;
    contact_title?: string;
    contact_email?: string;
    email_inferred?: boolean;
    confidence_score?: number;
    source_url?: string;
    source_title?: string;
    research_data?: any;
    created_at: string;
  };
  onClose: () => void;
}

export function CompanyDetails({ company, onClose }: CompanyDetailsProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Copy failed silently
    }
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;
    
    if (score >= 0.8) return <Badge variant="default">High Confidence</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium Confidence</Badge>;
    return <Badge variant="outline">Low Confidence</Badge>;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{company.company_name}</h2>
        <Button variant="outline" onClick={onClose}>
          Back to Dashboard
        </Button>
      </div>

      {/* Contact Information */}
      {(company.contact_name || company.contact_email) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
              {getConfidenceBadge(company.confidence_score)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {company.contact_name && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Name</label>
                  <div className="text-slate-900">{company.contact_name}</div>
                </div>
              )}
              
              {company.contact_title && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Title</label>
                  <div className="text-slate-900">{company.contact_title}</div>
                </div>
              )}
              
              {company.contact_email && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900">{company.contact_email}</span>
                    {company.email_inferred && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Inferred
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(company.contact_email!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {company.source_url && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Source</label>
                  <div>
                    <a
                      href={company.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {company.source_title || 'View Source'}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Research Data */}
      {company.research_data ? (
        <ResearchOutput 
          content={
            (() => {
              // Check if it's the rich research data format (NEW) - check at top level first
              if (company.research_data.company_overview || company.research_data.key_business_points) {
                return company.research_data;
              }
              
              // Check for verified_points (OLD format from verifier) with actual content
              if (company.research_data.verified_points && company.research_data.verified_points.length > 0) {
                return {
                  points: company.research_data.verified_points,
                  summary: company.research_data.overview || '',
                };
              }
              
              // Check for nested research structure
              if (company.research_data.research) {
                // If nested research has the rich data, use it
                if (company.research_data.research.company_overview || company.research_data.research.key_business_points) {
                  return company.research_data.research;
                }
                return {
                  summary: company.research_data.research.summary || '',
                  points: company.research_data.research.points || [],
                };
              }
              
              // For any other object structure, check if it has meaningful research data
              if (typeof company.research_data === 'object') {
                // Look for any field that suggests rich content
                const possibleContentFields = ['company_overview', 'key_business_points', 'business_overview', 'overview', 'description'];
                const hasRichContent = possibleContentFields.some(field => 
                  company.research_data[field] && 
                  typeof company.research_data[field] === 'string' && 
                  company.research_data[field].length > 50
                );
                
                if (hasRichContent) {
                  return company.research_data;
                }
              }
              
              return {
                summary: 'Research data available but in unsupported format. Please check the debug section below.',
                points: []
              };
            })()
          }
          contact={company.research_data.contact || company.research_data.contact_information || null}
        />
      ) : (
        <Card className="shadow bg-gradient-to-br from-red-50/50 to-orange-50/50">
          <CardHeader>
            <CardTitle className="text-red-900 text-lg">No Research Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-500 italic">No research data found for this company. This might indicate an issue with data storage or retrieval.</div>
          </CardContent>
        </Card>
      )}
      
      {/* Debug Section - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="shadow bg-gradient-to-br from-gray-50/50 to-slate-50/50">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">Debug: Raw Research Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(company.research_data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
      
      {/* Generated Messages */}
      {company.research_data?.messages && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Mail className="h-5 w-5" />
              Generated Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {company.research_data.messages.linkedin && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-2">LinkedIn Message</h4>
                  <p className="text-slate-700 whitespace-pre-wrap">{company.research_data.messages.linkedin}</p>
                </div>
              )}
              {company.research_data.messages.email && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-2">Email Draft</h4>
                  <p className="text-slate-700 whitespace-pre-wrap">{company.research_data.messages.email}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Research Date */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-slate-600">
            Researched on {new Date(company.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}