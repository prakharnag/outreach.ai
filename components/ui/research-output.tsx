"use client";

import { Building2, Users, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { SourceLink } from "./source-link";

interface ResearchOutputProps {
  content: string;
  contact?: {
    name?: string;
    title?: string;
    email?: string;
    source?: { title: string; url: string };
  };
  onCopyEmail?: (email: string) => void;
}

export function ResearchOutput({ content, contact, onCopyEmail }: ResearchOutputProps) {
  const parseContent = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const sections: Array<{
      title: string;
      content: string[];
      type: 'Company Overview' | 'Key Business' | 'Contact Information' | 'Confidence' | 'other';
    }> = [];
    
    let currentSection: any = null;
    
    for (const line of lines) {
      // Check for expected section headers
      if (line === 'Company Overview' || line === '**Company Overview**') {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: 'Company Overview', content: [], type: 'overview' };
        continue;
      }
      
      if (line === 'Key Business Points' || line === '**Key Business Points**') {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: 'Key Business Points', content: [], type: 'business' };
        continue;
      }
      
      if (line === 'Contact Information' || line === '**Contact Information**') {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: 'Contact Information', content: [], type: 'contact' };
        continue;
      }
      
      if (line === 'Confidence Assessment' || line === '**Confidence Assessment**') {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: 'Confidence Assessment', content: [], type: 'confidence' };
        continue;
      }
      
      // Add content to current section
      if (!currentSection) {
        currentSection = { title: 'Research Results', content: [], type: 'other' };
      }
      currentSection.content.push(line);
    }
    
    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const renderTextWithSources = (text: string) => {
    // Convert markdown-style links to clickable links (same logic as company-details.tsx)
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
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            {part}
            <SourceLink url={url} title={part} />
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

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'Company Overview': return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'Key Business Points': return <Rocket className="h-5 w-5 text-green-600" />;
      case 'Contact Information': return <Users className="h-5 w-5 text-purple-600" />;
      case 'Confidence': return <Building2 className="h-5 w-5 text-amber-600" />;
      default: return <Building2 className="h-5 w-5 text-slate-600" />;
    }
  };

  const sections = parseContent(content);

  return (
    <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Building2 className="h-5 w-5" />
          Company Research
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={index} className="space-y-3">
              <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                {getSectionIcon(section.type)}
                {section.title}
              </h3>
              
              <div className="space-y-2">
                {section.content.map((line, lineIndex) => (
                  <div key={lineIndex} className="flex items-start gap-2">
                    {line.startsWith('-') || line.startsWith('•') ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <div className="text-slate-700 leading-relaxed flex-1">
                          {renderTextWithSources(line.replace(/^[-•]\s*/, ''))}
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-700 leading-relaxed w-full">
                        {renderTextWithSources(line)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}