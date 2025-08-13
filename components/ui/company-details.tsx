"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { User, Mail, ExternalLink, Copy } from "lucide-react";

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
      console.error('Failed to copy text: ', err);
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
      {company.research_data && (
        <Card>
          <CardHeader>
            <CardTitle>Research Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {(() => {
                let researchContent = '';
                
                if (typeof company.research_data === 'string') {
                  researchContent = company.research_data;
                } else if (company.research_data.research) {
                  researchContent = company.research_data.research;
                } else {
                  researchContent = JSON.stringify(company.research_data, null, 2);
                }
                
                // Convert markdown-style links to clickable links
                const renderWithLinks = (text: string) => {
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                  const parts = text.split(linkRegex);
                  
                  return parts.map((part, index) => {
                    if (index % 3 === 1) {
                      // This is link text
                      const url = parts[index + 1];
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {part}
                        </a>
                      );
                    } else if (index % 3 === 2) {
                      // This is the URL part, skip it
                      return null;
                    }
                    // Regular text
                    return <span key={index}>{part}</span>;
                  });
                };
                
                return (
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {renderWithLinks(researchContent)}
                  </div>
                );
              })()}
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