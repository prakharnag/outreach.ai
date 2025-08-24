"use client";

import { Building2, Users, Rocket, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { SourceLink } from "./source-link";

interface ResearchOutputProps {
  content: string | { summary: string; points: Array<{ claim: string; source?: { title: string; url: string } }> } | any;
  contact?: {
    primary_contact?: { name?: string; title?: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
    secondary_contact?: { name?: string; title?: string; email?: string; source?: { title: string; url: string }; contact_type?: string };
  } | {
    name?: string;
    title?: string;
    email?: string;
    source?: { title: string; url: string };
  }; // legacy format
  onCopyEmail?: (email: string) => void;
}

export function ResearchOutput({ content, contact, onCopyEmail }: ResearchOutputProps) {
  // Handle the new structured JSON format from research agent
  const isStructuredJSON = typeof content === 'object' && content !== null && 
    (content.company_overview || content.key_business_points || content.contact_information || content.confidence_assessment);
  
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
            <div className="space-y-4 sm:space-y-6">
              {/* Company Overview */}
              {jsonContent.company_overview && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Company Overview
                  </h3>
                  <div className="text-sm sm:text-base text-slate-700 leading-relaxed pl-6 sm:pl-8">
                    {jsonContent.company_overview}
                  </div>
                </div>
              )}

              {/* Key Business Points */}
              {jsonContent.key_business_points && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                    <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    Key Business Points
                  </h3>
                  <div className="space-y-2 sm:space-y-3 pl-6 sm:pl-8">
                    {Object.entries(jsonContent.key_business_points).map(([key, value]: [string, any], index) => {
                      if (value && typeof value === 'object' && value.description) {
                        return (
                          <div key={index} className="flex items-start gap-2 sm:gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 sm:mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
                                {value.description}
                              </div>
                              {value.source_url && (
                                <div className="mt-1 sm:mt-2">
                                  <a
                                    href={value.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
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

              {/* Contact Information - check both JSON format and legacy contact prop */}
              {(() => {
                // Helper function to check if a value is valid (not N/A, empty, etc.)
                const isValidValue = (value: string | undefined) => {
                  if (!value || value.trim() === '') return false;
                  if (value === "N/A" || value === "n/a") return false;
                  if (value.toLowerCase().includes("no publicly available")) return false;
                  if (value.toLowerCase().includes("not available")) return false;
                  if (value.toLowerCase().includes("contact typically routed")) return false;
                  return true;
                };

                // Check if we have any valid contact information to display
                const contactInfo = jsonContent.contact_information || contact;
                if (!contactInfo) return null;

                // Check for valid contacts in the two-contact structure
                const hasTwoContacts = contactInfo?.primary_contact || contactInfo?.secondary_contact;
                if (hasTwoContacts) {
                  const hasValidPrimary = contactInfo.primary_contact && (
                    isValidValue(contactInfo.primary_contact.name) ||
                    isValidValue(contactInfo.primary_contact.title) ||
                    isValidValue(contactInfo.primary_contact.email)
                  );
                  const hasValidSecondary = contactInfo.secondary_contact && (
                    isValidValue(contactInfo.secondary_contact.name) ||
                    isValidValue(contactInfo.secondary_contact.title) ||
                    isValidValue(contactInfo.secondary_contact.email)
                  );
                  
                  if (!hasValidPrimary && !hasValidSecondary) return null;
                } else {
                  // Check legacy single contact structure
                  const hasValidContact = 
                    isValidValue(contactInfo?.name) ||
                    isValidValue(contactInfo?.title) ||
                    isValidValue(contactInfo?.email);
                  
                  if (!hasValidContact) return null;
                }

                return (
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                      Contact Information
                    </h3>
                    <div className="space-y-3 sm:space-y-4 pl-6 sm:pl-8">
                    {(() => {
                      // Check if this is the new two-contact structure
                      const hasTwoContacts = contactInfo?.primary_contact || contactInfo?.secondary_contact;
                      
                      if (hasTwoContacts) {
                        // Handle new two-contact structure
                        const contacts = [];
                        if (contactInfo.primary_contact) contacts.push({ ...contactInfo.primary_contact, isPrimary: true });
                        if (contactInfo.secondary_contact) contacts.push({ ...contactInfo.secondary_contact, isPrimary: false });
                        
                        // Filter out contacts with no valid information
                        const validContacts = contacts.filter(contact => 
                          isValidValue(contact?.name) ||
                          isValidValue(contact?.title) ||
                          isValidValue(contact?.email)
                        );

                        if (validContacts.length === 0) {
                          return (
                            <div className="text-sm text-slate-500 italic">
                              No direct contact information found in public sources. Consider reaching out through the company&apos;s official website or LinkedIn.
                            </div>
                          );
                        }

                        return validContacts.map((contact, index) => {
                          return (
                            <div key={index} className="border-l-2 border-indigo-200 pl-3 space-y-1 sm:space-y-2">
                              <h4 className="text-sm font-medium text-slate-600">
                                {contact.isPrimary ? "Primary Contact" : "Secondary Contact"}
                                {contact.contact_type && (
                                  <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                    {contact.contact_type === 'hiring' ? 'Hiring/Talent' : 'Leadership'}
                                  </span>
                                )}
                              </h4>
                              {isValidValue(contact.name) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 font-medium text-sm">Name:</span>
                                  <span className="text-slate-700 text-sm">{contact.name}</span>
                                </div>
                              )}
                              {isValidValue(contact.title) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 font-medium text-sm">Title:</span>
                                  <span className="text-slate-700 text-sm">{contact.title}</span>
                                </div>
                              )}
                              {isValidValue(contact.email) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 font-medium text-sm">Email:</span>
                                  <span className="text-slate-700 text-sm truncate">{contact.email}</span>
                                  {onCopyEmail && (
                                    <button
                                      onClick={() => onCopyEmail(contact.email!)}
                                      className="text-blue-600 hover:text-blue-800 text-xs underline flex-shrink-0"
                                    >
                                      Copy
                                    </button>
                                  )}
                                </div>
                              )}
                              {contact.source && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 font-medium text-sm">Source:</span>
                                  <a
                                    href={contact.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate">{contact.source.title}</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        });
                      } else {
                        // Handle legacy single contact structure
                        const hasValidContact = 
                          isValidValue(contactInfo?.name) ||
                          isValidValue(contactInfo?.title) ||
                          isValidValue(contactInfo?.email);

                        if (!hasValidContact) {
                          return (
                            <div className="text-sm text-slate-500 italic">
                              No direct contact information found in public sources. Consider reaching out through the company&apos;s official website or LinkedIn.
                            </div>
                          );
                        }

                        return (
                          <>
                            {isValidValue(contactInfo.name) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium">Name:</span>
                                <span className="text-slate-700">{contactInfo.name}</span>
                              </div>
                            )}
                            {isValidValue(contactInfo.title) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm sm:text-base">Title:</span>
                                <span className="text-slate-700 text-sm sm:text-base">{contactInfo.title}</span>
                              </div>
                            )}
                            {isValidValue(contactInfo.email) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm sm:text-base">Email:</span>
                                <span className="text-slate-700 text-sm sm:text-base truncate">{contactInfo.email}</span>
                                {onCopyEmail && (
                                  <button
                                    onClick={() => onCopyEmail(contactInfo.email!)}
                                    className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline flex-shrink-0"
                                  >
                                    Copy
                                  </button>
                                )}
                              </div>
                            )}
                            {contactInfo.note && (
                              <div className="text-xs sm:text-sm text-slate-500 italic">
                                {contactInfo.note}
                              </div>
                            )}
                            {contactInfo.source && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm sm:text-base">Source:</span>
                                <a
                                  href={contactInfo.source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate">{contactInfo.source.title}</span>
                                </a>
                              </div>
                            )}
                          </>
                        );
                      }
                    })()}
                    </div>
                  </div>
                );
              })()}

              {/* Confidence Assessment */}
              {jsonContent.confidence_assessment && (
                <div className="space-y-2 sm:space-y-3">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    Confidence Assessment
                  </h3>
                  <div className="space-y-1 sm:space-y-2 pl-6 sm:pl-8">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium text-sm sm:text-base">Level:</span>
                      <span className="text-slate-700 text-sm sm:text-base">{jsonContent.confidence_assessment.level}</span>
                    </div>
                    {jsonContent.confidence_assessment.explanation && (
                      <div className="text-slate-700 leading-relaxed text-sm sm:text-base">
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
          <CardTitle className="flex items-center gap-2 text-blue-900 text-lg sm:text-xl">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Company Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6">
            {/* Company Overview */}
            {structuredContent.summary && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Company Overview
                </h3>
                <div className="text-sm sm:text-base text-slate-700 leading-relaxed pl-6 sm:pl-8">
                  {structuredContent.summary}
                </div>
              </div>
            )}

            {/* Key Business Points */}
            {structuredContent.points && structuredContent.points.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                  <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Key Business Points
                </h3>
                <div className="space-y-2 sm:space-y-3 pl-6 sm:pl-8">
                  {structuredContent.points.map((point, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 sm:mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
                          {point.claim}
                        </div>
                        {point.source && (
                          <div className="mt-1 sm:mt-2">
                            <a
                              href={point.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{point.source.title}</span>
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
            {contact && (
              <div className="space-y-2 sm:space-y-3">
                <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Contact Information
                </h3>
                <div className="space-y-3 sm:space-y-4 pl-6 sm:pl-8">
                  {(() => {
                    const isValidValue = (value: string | undefined) => {
                      if (!value || value.trim() === '') return false;
                      if (value === "N/A" || value === "n/a") return false;
                      if (value.toLowerCase().includes("no publicly available")) return false;
                      if (value.toLowerCase().includes("not available")) return false;
                      if (value.toLowerCase().includes("contact typically routed")) return false;
                      return true;
                    };

                    // Check if this is the new two-contact structure  
                    const hasTwoContacts = (contact as any)?.primary_contact || (contact as any)?.secondary_contact;
                    
                    if (hasTwoContacts) {
                      // Handle new two-contact structure
                      const contacts = [];
                      if ((contact as any).primary_contact) contacts.push({ ...(contact as any).primary_contact, isPrimary: true });
                      if ((contact as any).secondary_contact) contacts.push({ ...(contact as any).secondary_contact, isPrimary: false });
                      
                      if (contacts.length === 0) {
                        return (
                          <div className="text-sm text-slate-500 italic">
                            No direct contact information found in public sources. Consider reaching out through the company&apos;s official website or LinkedIn.
                          </div>
                        );
                      }

                      return contacts.map((contactItem, index) => {
                        const hasValidContact = 
                          isValidValue(contactItem?.name) ||
                          isValidValue(contactItem?.title) ||
                          isValidValue(contactItem?.email);

                        if (!hasValidContact) return null;

                        return (
                          <div key={index} className="border-l-2 border-indigo-200 pl-3 space-y-1 sm:space-y-2">
                            <h4 className="text-sm font-medium text-slate-600">
                              {contactItem.isPrimary ? "Primary Contact" : "Secondary Contact"}
                              {contactItem.contact_type && (
                                <span className="ml-2 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  {contactItem.contact_type === 'hiring' ? 'Hiring/Talent' : 'Leadership'}
                                </span>
                              )}
                            </h4>
                            {isValidValue(contactItem.name) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm">Name:</span>
                                <span className="text-slate-700 text-sm">{contactItem.name}</span>
                              </div>
                            )}
                            {isValidValue(contactItem.title) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm">Title:</span>
                                <span className="text-slate-700 text-sm">{contactItem.title}</span>
                              </div>
                            )}
                            {isValidValue(contactItem.email) && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm">Email:</span>
                                <span className="text-slate-700 text-sm truncate">{contactItem.email}</span>
                                {onCopyEmail && (
                                  <button
                                    onClick={() => onCopyEmail(contactItem.email!)}
                                    className="text-blue-600 hover:text-blue-800 text-xs underline flex-shrink-0"
                                  >
                                    Copy
                                  </button>
                                )}
                              </div>
                            )}
                            {contactItem.source && (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600 font-medium text-sm">Source:</span>
                                <a
                                  href={contactItem.source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate">{contactItem.source.title}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      });
                    } else {
                      // Handle legacy single contact structure
                      const hasValidContact = 
                        isValidValue((contact as any)?.name) ||
                        isValidValue((contact as any)?.title) ||
                        isValidValue((contact as any)?.email);

                      if (!hasValidContact) {
                        return (
                          <div className="text-xs sm:text-sm text-slate-500 italic">
                            No direct contact information found in public sources. Consider reaching out through the company&apos;s official website or LinkedIn.
                          </div>
                        );
                      }

                      return (
                        <>
                          {isValidValue((contact as any).name) && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-medium text-sm sm:text-base">Name:</span>
                              <span className="text-slate-700 text-sm sm:text-base">{(contact as any).name}</span>
                            </div>
                          )}
                          {isValidValue((contact as any).title) && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-medium text-sm sm:text-base">Title:</span>
                              <span className="text-slate-700 text-sm sm:text-base">{(contact as any).title}</span>
                            </div>
                          )}
                          {isValidValue((contact as any).email) && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-medium text-sm sm:text-base">Email:</span>
                              <span className="text-slate-700 text-sm sm:text-base truncate">{(contact as any).email}</span>
                              {onCopyEmail && (
                                <button
                                  onClick={() => onCopyEmail((contact as any).email!)}
                                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline flex-shrink-0"
                                >
                                  Copy
                                </button>
                              )}
                            </div>
                          )}
                          {(contact as any).source && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-medium text-sm sm:text-base">Source:</span>
                              <a
                                href={(contact as any).source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate">{(contact as any).source.title}</span>
                              </a>
                            </div>
                          )}
                        </>
                      );
                    }
                  })()}
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
          <CardTitle className="flex items-center gap-2 text-blue-900 text-lg sm:text-xl">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Company Research
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for string content (legacy support)
  const parseContent = (text: any) => {
    // If we receive a non-string object that isn't structured correctly, convert it to a readable format
    if (typeof text !== 'string') {
      if (text && typeof text === 'object') {
        // Try to extract meaningful content from unstructured JSON
        if (text.company_overview || text.summary) {
          // Convert to a readable string format
          let readableText = '';
          if (text.company_overview) {
            readableText += `## Company Overview\n${text.company_overview}\n\n`;
          }
          if (text.summary) {
            readableText += `## Summary\n${text.summary}\n\n`;
          }
          if (text.key_business_points) {
            readableText += `## Key Business Points\n`;
            Object.entries(text.key_business_points).forEach(([key, value]: [string, any]) => {
              if (value && typeof value === 'object' && value.description) {
                readableText += `- ${value.description}\n`;
              }
            });
            readableText += '\n';
          }
          if (text.contact_information) {
            readableText += `## Contact Information\n`;
            if (text.contact_information.name) readableText += `Name: ${text.contact_information.name}\n`;
            if (text.contact_information.title) readableText += `Title: ${text.contact_information.title}\n`;
            if (text.contact_information.email) readableText += `Email: ${text.contact_information.email}\n`;
          }
          text = readableText;
        } else {
          // Last resort: convert to JSON string but make it readable
          text = JSON.stringify(text, null, 2);
        }
      } else {
        text = text ? String(text) : '';
      }
    }
    const lines = text.split('\n').map((line: string) => line.trim()).filter(Boolean);
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
      case 'overview': return <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />;
      case 'business': return <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />;
      case 'contact': return <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />;
      case 'confidence': return <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />;
      default: return <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />;
    }
  };

  const sections = parseContent(content as string);

  return (
    <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 text-lg sm:text-xl">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Company Research
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 sm:space-y-6">
          {sections.map((section, index) => (
            <div key={index} className="space-y-2 sm:space-y-3">
              <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-semibold text-slate-800">
                {getSectionIcon(section.type)}
                {section.title}
              </h3>
              
              <div className="space-y-1 sm:space-y-2 pl-6 sm:pl-8">
                {section.content.map((line, lineIndex) => (
                  <div key={lineIndex} className="flex items-start gap-2">
                    {line.startsWith('-') || line.startsWith('•') ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 sm:mt-2 flex-shrink-0" />
                        <div className="text-sm sm:text-base text-slate-700 leading-relaxed flex-1 min-w-0">
                          {renderTextWithSources(line.replace(/^[-•]\s*/, ''))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm sm:text-base text-slate-700 leading-relaxed w-full">
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