"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Building2, DollarSign, Code, Rocket, Users, ExternalLink, Mail, Copy, Shield } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";

interface ResearchOutputProps {
  content: string;
  contact?: {
    name?: string;
    title?: string;
    email?: string;
    source?: { title: string; url: string };
  };
  confidence?: number;
  onCopyEmail?: (email: string) => void;
}

export function ResearchOutput({ content, contact, confidence, onCopyEmail }: ResearchOutputProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const renderMarkdownContent = (text: string) => {
    const sections = text.split(/(?=^#{1,3}\s)/m).filter(Boolean);
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const headerLine = lines[0];
      const contentLines = lines.slice(1);
      
      // Check if it's a header
      const headerMatch = headerLine.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const sectionId = `section-${index}`;
        
        // Parse content for this section
        const bulletPoints = contentLines
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
          .map(line => line.replace(/^[-•]\s*/, '').trim());
        
        const regularContent = contentLines
          .filter(line => !line.trim().startsWith('-') && !line.trim().startsWith('•') && line.trim())
          .join(' ');

        return (
          <div key={index} className="mb-6">
            {renderSectionHeader(title, level, sectionId, bulletPoints.length > 5)}
            {renderSectionContent(regularContent, bulletPoints, sectionId)}
          </div>
        );
      }
      
      // Regular content without header
      return (
        <div key={index} className="mb-4">
          {renderTextWithLinks(section)}
        </div>
      );
    });
  };

  const renderSectionHeader = (title: string, level: number, sectionId: string, isCollapsible: boolean) => {
    const icon = getSectionIcon(title);
    const HeaderTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
    const textSize = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base';
    
    if (isCollapsible) {
      return (
        <button
          onClick={() => toggleSection(sectionId)}
          className={`flex items-center gap-3 w-full text-left ${textSize} font-semibold text-slate-800 mb-3 hover:text-blue-600 transition-colors`}
        >
          {icon}
          <span className="flex-1">{title}</span>
          {expandedSections.has(sectionId) ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
          }
        </button>
      );
    }

    return (
      <HeaderTag className={`flex items-center gap-3 ${textSize} font-semibold text-slate-800 mb-3`}>
        {icon}
        {title}
      </HeaderTag>
    );
  };

  const renderSectionContent = (regularContent: string, bulletPoints: string[], sectionId: string) => {
    const isCollapsible = bulletPoints.length > 5;
    const isExpanded = expandedSections.has(sectionId);
    const displayPoints = isCollapsible && !isExpanded ? bulletPoints.slice(0, 5) : bulletPoints;

    return (
      <div className="space-y-3">
        {regularContent && (
          <div className="text-slate-700 leading-relaxed">
            {renderTextWithLinks(regularContent)}
          </div>
        )}
        
        {bulletPoints.length > 0 && (
          <div className="space-y-2">
            {displayPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="text-slate-700 leading-relaxed">
                  {renderTextWithLinks(point)}
                </div>
              </div>
            ))}
            
            {isCollapsible && !isExpanded && (
              <button
                onClick={() => toggleSection(sectionId)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 mt-2"
              >
                Show {bulletPoints.length - 5} more items
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = text.split(urlRegex);
    
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
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
            title={url}
          >
            {part}
            <ExternalLink className="h-3 w-3" />
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

  const getSectionIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('overview') || titleLower.includes('company')) {
      return <Building2 className="h-5 w-5 text-blue-600" />;
    }
    if (titleLower.includes('business') || titleLower.includes('key')) {
      return <Rocket className="h-5 w-5 text-green-600" />;
    }
    if (titleLower.includes('contact')) {
      return <Users className="h-5 w-5 text-purple-600" />;
    }
    if (titleLower.includes('confidence') || titleLower.includes('assessment')) {
      return <Shield className="h-5 w-5 text-orange-600" />;
    }
    return <Building2 className="h-5 w-5 text-slate-600" />;
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return null;
    
    if (score >= 0.8) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">High Confidence</Badge>;
    }
    if (score >= 0.7) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium Confidence</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-red-200">Low Confidence</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Main Research Content */}
      <Card className="shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardContent className="pt-6">
          <div className="prose prose-slate max-w-none">
            {renderMarkdownContent(content)}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      {contact && (contact.name || contact.email) && (
        <Card className="shadow-lg border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Contact Information
              </div>
              {getConfidenceBadge(confidence)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contact.name && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Name</label>
                  <div className="text-slate-900 font-medium">{contact.name}</div>
                </div>
              )}
              
              {contact.title && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Title</label>
                  <div className="text-slate-900">{contact.title}</div>
                </div>
              )}
              
              {contact.email && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {contact.email}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopyEmail?.(contact.email!)}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              
              {contact.source?.url && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Source</label>
                  <div>
                    <a
                      href={contact.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                    >
                      {contact.source.title}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}