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
    // Extract URLs from text and add chain icons
    const urlRegex = /(https?:\/\/[^\s\)\]\}]+)/g;
    const urls = text.match(urlRegex) || [];
    
    // Remove URLs from text to clean it up
    const cleanText = text.replace(urlRegex, '').trim();
    
    return (
      <div className="flex items-center gap-2">
        <span>{cleanText}</span>
        {urls.map((url, index) => (
          <SourceLink
            key={index}
            url={url}
            title="View source"
          />
        ))}
      </div>
    );
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