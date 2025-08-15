"use client";

import { Building2, Users, Rocket, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { SourceLink } from "./source-link";

interface ResearchOutputProps {
  content: string | { summary: string; points: Array<{ claim: string; source?: { title: string; url: string } }> } | any;
  contact?: {
    name?: string;
    title?: string;
    email?: string;
    source?: { title: string; url: string };
  };
  onCopyEmail?: (email: string) => void;
}

export function ResearchOutput({ content, contact, onCopyEmail }: ResearchOutputProps) {
  // Debug logging for research output
  console.log('[ResearchOutput] Received props:', {
    contentType: typeof content,
    hasContent: !!content,
    contentKeys: content && typeof content === 'object' ? Object.keys(content) : [],
    hasContact: !!contact,
    contactKeys: contact ? Object.keys(contact) : [],
    contentSample: content ? JSON.stringify(content).slice(0, 300) + '...' : null
  });

  // Handle the new structured JSON format from research agent
  const isStructuredJSON = typeof content === 'object' && content !== null && 
    (content.company_overview || content.key_business_points);
  
  console.log('[ResearchOutput] Data analysis:', {
    isStructuredJSON,
    hasCompanyOverview: !!(content as any)?.company_overview,
    hasKeyBusinessPoints: !!(content as any)?.key_business_points,
    hasPoints: !!(content as any)?.points,
    hasSummary: !!(content as any)?.summary
  });
  
  if (isStructuredJSON) {
    // Use the content directly since it's now the JSON object
    const jsonContent = content;
    
    // If jsonContent is empty or null, fall back to string content
    if (!jsonContent || Object.keys(jsonContent).length === 0) {
      // Fall back to the original content handling
    } else {
      return (
        <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <CardHeader>
            
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Company Overview */}
              {jsonContent.company_overview && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Company Overview
                  </h3>
                  <div className="text-slate-700 leading-relaxed pl-8">
                    {jsonContent.company_overview}
                  </div>
                </div>
              )}

              {/* Key Business Points */}
              {jsonContent.key_business_points && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                    <Rocket className="h-5 w-5 text-green-600" />
                    Key Business Points
                  </h3>
                  <div className="space-y-3 pl-8">
                    {Object.entries(jsonContent.key_business_points).map(([key, value]: [string, any], index) => {
                      if (value && typeof value === 'object' && value.description) {
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-slate-700 leading-relaxed">
                                {value.description}
                              </div>
                              {value.source_url && (
                                <div className="mt-2">
                                  <a
                                    href={value.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {jsonContent.contact_information && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                    <Users className="h-5 w-5 text-purple-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 pl-8">
                    {jsonContent.contact_information.name && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Name:</span>
                        <span className="text-slate-700">{jsonContent.contact_information.name}</span>
                      </div>
                    )}
                    {jsonContent.contact_information.title && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Title:</span>
                        <span className="text-slate-700">{jsonContent.contact_information.title}</span>
                      </div>
                    )}
                    {jsonContent.contact_information.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-medium">Email:</span>
                        <span className="text-slate-700">{jsonContent.contact_information.email}</span>
                        {onCopyEmail && (
                          <button
                            onClick={() => onCopyEmail(jsonContent.contact_information.email)}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    )}
                    {jsonContent.contact_information.note && (
                      <div className="text-sm text-slate-500 italic">
                        {jsonContent.contact_information.note}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confidence Assessment */}
              {jsonContent.confidence_assessment && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                    <Building2 className="h-5 w-5 text-amber-600" />
                    Confidence Assessment
                  </h3>
                  <div className="space-y-2 pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Level:</span>
                      <span className="text-slate-700">{jsonContent.confidence_assessment.level}</span>
                    </div>
                    {jsonContent.confidence_assessment.explanation && (
                      <div className="text-slate-700 leading-relaxed">
                        {jsonContent.confidence_assessment.explanation}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Handle the old structured format (for backward compatibility)
  const isStructured = typeof content === 'object' && content !== null && content.points;
  
  if (isStructured) {
    const structuredContent = content as { summary: string; points: Array<{ claim: string; source?: { title: string; url: string } }> };
    
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
            {/* Company Overview */}
            {structuredContent.summary && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Company Overview
                </h3>
                <div className="text-slate-700 leading-relaxed pl-8">
                  {structuredContent.summary}
                </div>
              </div>
            )}

            {/* Key Business Points */}
            {structuredContent.points && structuredContent.points.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  <Rocket className="h-5 w-5 text-green-600" />
                  Key Business Points
                </h3>
                <div className="space-y-3 pl-8">
                  {structuredContent.points.map((point, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-slate-700 leading-relaxed">
                          {point.claim}
                        </div>
                        {point.source && (
                          <div className="mt-2">
                            <a
                              href={point.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {point.source.title}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information */}
            {contact && (contact.name || contact.email) && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                  <Users className="h-5 w-5 text-purple-600" />
                  Contact Information
                </h3>
                <div className="space-y-2 pl-8">
                  {contact.name && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Name:</span>
                      <span className="text-slate-700">{contact.name}</span>
                    </div>
                  )}
                  {contact.title && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Title:</span>
                      <span className="text-slate-700">{contact.title}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Email:</span>
                      <span className="text-slate-700">{contact.email}</span>
                      {onCopyEmail && (
                        <button
                          onClick={() => onCopyEmail(contact.email!)}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  )}
                  {contact.source && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Source:</span>
                      <a
                        href={contact.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {contact.source.title}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle plain string content (fallback)
  if (typeof content === 'string') {
    return (
      <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Building2 className="h-5 w-5" />
            Company Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for string content (legacy support)
  const parseContent = (text: string) => {
    if (typeof text !== 'string') {
      text = text ? JSON.stringify(text, null, 2) : '';
    }
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const sections: Array<{
      title: string;
      content: string[];
      type: 'overview' | 'business' | 'contact' | 'confidence' | 'other';
    }> = [];
    
    let currentSection: any = null;
    
    for (const line of lines) {
      // Check for markdown headers (##) or section headers
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
      if (headerMatch) {
        const title = headerMatch[1];
        if (currentSection) sections.push(currentSection);
        
        let type: 'overview' | 'business' | 'contact' | 'confidence' | 'other' = 'other';
        if (title.toLowerCase().includes('overview') || title.toLowerCase().includes('company')) type = 'overview';
        else if (title.toLowerCase().includes('business') || title.toLowerCase().includes('key')) type = 'business';
        else if (title.toLowerCase().includes('contact') || title.toLowerCase().includes('information')) type = 'contact';
        else if (title.toLowerCase().includes('confidence') || title.toLowerCase().includes('assessment')) type = 'confidence';
        
        currentSection = { title, content: [], type };
        continue;
      }
      
      // Check for **Header** format
      if (line.startsWith('**') && line.endsWith('**')) {
        const title = line.replace(/\*\*/g, '');
        if (currentSection) sections.push(currentSection);
        
        let type: 'overview' | 'business' | 'contact' | 'confidence' | 'other' = 'other';
        if (title.toLowerCase().includes('overview') || title.toLowerCase().includes('company')) type = 'overview';
        else if (title.toLowerCase().includes('business') || title.toLowerCase().includes('key')) type = 'business';
        else if (title.toLowerCase().includes('contact') || title.toLowerCase().includes('information')) type = 'contact';
        else if (title.toLowerCase().includes('confidence') || title.toLowerCase().includes('assessment')) type = 'confidence';
        
        currentSection = { title, content: [], type };
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
    // First handle bold subheadings (**Text:**)
    const boldRegex = /\*\*([^*]+):\*\*/g;
    let processedText = text.replace(boldRegex, '<strong>$1:</strong>');
    
    // Then handle markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = processedText.split(linkRegex);
    
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
      // Regular text with bold formatting
      return (
        <span 
          key={index} 
          dangerouslySetInnerHTML={{ __html: part }}
        />
      );
    });
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'overview': return <Building2 className="h-5 w-5 text-blue-600" />;
      case 'business': return <Rocket className="h-5 w-5 text-green-600" />;
      case 'contact': return <Users className="h-5 w-5 text-purple-600" />;
      case 'confidence': return <Building2 className="h-5 w-5 text-amber-600" />;
      default: return <Building2 className="h-5 w-5 text-slate-600" />;
    }
  };

  const sections = parseContent(content as string);

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