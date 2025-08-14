"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { SourceLink } from "../../components/ui/source-link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Textarea } from "../../components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/ui/accordion";
import { Copy, Mail, MessageSquare, RefreshCw, Scissors, Search, User, Settings as SettingsIcon, Menu, BarChart3 } from "lucide-react";
import { signOut, createClient } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { CompanyAutocomplete } from "../../components/ui/company-autocomplete";
import { Settings } from "../../components/ui/settings";
import { AnalyticsDashboard } from "../../components/ui/analytics-dashboard";
import { KPIDashboard } from "../../components/ui/kpi-dashboard";
import { ExpandableHistory } from "../../components/ui/expandable-history";
import { ContactResultsTable } from "../../components/ui/contact-results-table";
import { DynamicHeader } from "../../components/ui/dynamic-header";
import { Dashboard } from "../../components/ui/dashboard";
import { useUser } from "../../hooks/useUser";
import { ResearchSpinner } from "../../components/ui/research-spinner";
import { CompanyLink } from "../../components/ui/company-link";


interface ResearchFinding {
  title: string;
  description?: string;
  url?: string;
}

type ChainResponse = {
  research: string;
  verified: string;
  outputs: { linkedin: string; email: string };
  _status?: { research?: string; verify?: string; messaging?: string };
  _intermediate?: { research?: string; verified?: string };
  verified_points?: Array<{ claim: string; source: { title: string; url: string } }>;
  contact?: { name: string; title: string; email?: string; source?: { title: string; url: string } };
};

type NdEvent =
  | { type: "status"; data: any }
  | { type: "intermediate"; data: any }
  | { type: "final"; data: ChainResponse }
  | { type: "error"; data: { message: string } };

interface EmailHistory {
  id: string;
  company_name: string;
  role: string;
  subject_line: string;
  content: string;
  created_at: string;
}

interface LinkedInHistory {
  id: string;
  company_name: string;
  role: string;
  content: string;
  created_at: string;
}

export default function HomePage() {
  // User data
  const { user, loading: userLoading } = useUser();
  
  // Navigation state
  const [activeView, setActiveView] = useState<"home" | "search" | "email" | "linkedin" | "research" | "analytics" | "settings">("home");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  

  
  // Research state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChainResponse | null>(null);
  const [intermediate, setIntermediate] = useState<{ research?: string; verified?: string }>({});
  const [status, setStatus] = useState<{ research?: string; verify?: string; messaging?: string }>({});
  const [linkedin, setLinkedin] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [editableEmail, setEditableEmail] = useState<string>("");
  const [editableLinkedin, setEditableLinkedin] = useState<string>("");
  const [verifiedPoints, setVerifiedPoints] = useState<Array<{ claim: string; source: { title: string; url: string } }>>([]);
  const [contact, setContact] = useState<{ name: string; title: string; email?: string; source?: { title: string; url: string } } | null>(null);
  const [primaryEmail, setPrimaryEmail] = useState<string>("");
  const [researchData, setResearchData] = useState<any>(null);

  // Form state
  const [searchData, setSearchData] = useState({ company: "", domain: "", role: "", highlights: "" });
  const [company, setCompany] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [role, setRole] = useState("");
  const [highlights, setHighlights] = useState("");
  const [hasValidCompany, setHasValidCompany] = useState(false);
  
  // History state
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [linkedinHistory, setLinkedinHistory] = useState<LinkedInHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [contactResults, setContactResults] = useState<any[]>([]);
  
  const canRun = useMemo(() => hasValidCompany && !!role && !!highlights, [hasValidCompany, role, highlights]);
  const abortRef = useRef<AbortController | null>(null);
  const supabase = useMemo(() => createClient(), []);
  
  // Real-time subscriptions with comprehensive error handling
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupSubscriptions = () => {
      try {
        const emailChannel = supabase
          .channel('email_history_changes')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'email_history' },
            (payload: any) => {
              const newEmail = payload.new as EmailHistory;
              setEmailHistory(prev => {
                // Prevent duplicates
                if (prev.some(email => email.id === newEmail.id)) return prev;
                return [newEmail, ...prev];
              });
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'email_history' },
            (payload: any) => {
              const updatedEmail = payload.new as EmailHistory;
              setEmailHistory(prev => 
                prev.map(email => email.id === updatedEmail.id ? updatedEmail : email)
              );
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(setupSubscriptions, 1000 * retryCount);
            }
          });
          
        const linkedinChannel = supabase
          .channel('linkedin_history_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'linkedin_history' },
            (payload: any) => {
              const newMessage = payload.new as LinkedInHistory;
              setLinkedinHistory(prev => {
                // Prevent duplicates
                if (prev.some(msg => msg.id === newMessage.id)) return prev;
                return [newMessage, ...prev];
              });
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'linkedin_history' },
            (payload: any) => {
              const updatedMessage = payload.new as LinkedInHistory;
              setLinkedinHistory(prev => 
                prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
              );
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(setupSubscriptions, 1000 * retryCount);
            }
          });
          
        const contactChannel = supabase
          .channel('contact_results_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'contact_results' },
            (payload: any) => {
              const newContact = payload.new;
              setContactResults(prev => {
                // Prevent duplicates
                if (prev.some(contact => contact.id === newContact.id)) return prev;
                return [newContact, ...prev];
              });
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(setupSubscriptions, 1000 * retryCount);
            }
          });
          
        return () => {
          emailChannel.unsubscribe();
          linkedinChannel.unsubscribe();
          contactChannel.unsubscribe();
        };
      } catch (error) {
        console.error('Subscription setup failed:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupSubscriptions, 1000 * retryCount);
        }
      }
    };
    
    const cleanup = setupSubscriptions();
    return cleanup;
  }, [supabase]);

  // Human-readable research content renderer
  const renderResearchContent = (content: string | any) => {
    if (!content) return null;
    
    const textContent = typeof content === 'string' ? content : content.summary || String(content);
    
    // Extract URLs from text and make them clickable
    const renderTextWithLinks = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s\)]+)/g;
      const parts = text.split(urlRegex);
      
      return parts.map((part, index) => {
        if (urlRegex.test(part)) {
          // Use CompanyLink for company URLs, SourceLink for others
          const isCompanyUrl = part.includes('company') || part.includes('corp') || part.includes('.com');
          return isCompanyUrl ? (
            <CompanyLink 
              key={index}
              url={part}
              className="ml-2"
            />
          ) : (
            <SourceLink 
              key={index}
              url={part} 
              title={part}
            />
          );
        }
        return part;
      });
    };
    
    return (
      <div className="research-card">
        <div className="text-slate-800 relative z-10 leading-relaxed space-y-4">
          {textContent.split('\n').map((paragraph: string, idx: number) => {
            if (!paragraph.trim()) return null;
            
            // Style bullet points
            if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-')) {
              return (
                <div key={idx} className="flex items-start gap-3 ml-4">
                  <div className="insight-bullet-modern mt-2" />
                  <div className="flex-1">
                    {renderTextWithLinks(paragraph.replace(/^[•-]\s*/, ''))}
                  </div>
                </div>
              );
            }
            
            // Style headings (lines ending with :)
            if (paragraph.trim().endsWith(':')) {
              return (
                <h4 key={idx} className="font-semibold text-lg text-primary mt-6 mb-2">
                  {paragraph.trim()}
                </h4>
              );
            }
            
            // Regular paragraphs
            return (
              <p key={idx} className="text-slate-700">
                {renderTextWithLinks(paragraph)}
              </p>
            );
          }).filter(Boolean)}
        </div>
      </div>
    );
  };

  // Function to extract primary email from research
  const extractPrimaryEmail = (researchData: any, contactData: any) => {
    if (contactData?.email) return contactData.email;
    
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const researchText = typeof researchData === 'string' ? researchData : JSON.stringify(researchData);
    const emails = researchText.match(emailRegex);
    
    if (emails && emails.length > 0) {
      // Prioritize common business email patterns
      const businessEmails = emails.filter(email => 
        !email.includes('noreply') && 
        !email.includes('support') && 
        !email.includes('info') &&
        (email.includes('ceo') || email.includes('founder') || email.includes('hr') || email.includes('recruiting'))
      );
      return businessEmails[0] || emails[0];
    }
    
    return "";
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const loadEmailHistory = useCallback(async () => {
    if (emailHistory.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history/emails');
      if (res.ok) {
        const data = await res.json();
        setEmailHistory(data);
      }
    } catch (error) {
      console.error('Failed to load email history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [emailHistory.length]);
  
  const loadLinkedInHistory = useCallback(async () => {
    if (linkedinHistory.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history/linkedin');
      if (res.ok) {
        const data = await res.json();
        setLinkedinHistory(data);
      }
    } catch (error) {
      console.error('Failed to load LinkedIn history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [linkedinHistory.length]);
  
  const loadContactResults = useCallback(async () => {
    try {
      const res = await fetch('/api/contact-results');
      if (res.ok) {
        const data = await res.json();
        setContactResults(data);
      }
    } catch (error) {
      console.error('Failed to load contact results:', error);
    }
  }, []);
  
  const saveContactResult = useCallback(async (contactData: any) => {
    try {
      const res = await fetch('/api/contact-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to save contact result:', errorData);
        setError(`Failed to save research data: ${errorData.error || 'Unknown error'}`);
        return false;
      }
      
      const savedData = await res.json();
      console.log('Contact result saved successfully:', savedData);
      return true;
    } catch (error) {
      console.error('Failed to save contact result:', error);
      setError('Failed to save research data. Please try again.');
      return false;
    }
  }, []);
  
  const handleNavClick = (view: "home" | "search" | "email" | "linkedin" | "research" | "analytics" | "settings") => {
    if (view === "search") {
      setIsSearchExpanded(!isSearchExpanded);
      // Don't change activeView to preserve current content
    } else {
      setIsSearchExpanded(false);
      setActiveView(view);
      if (view === "email") loadEmailHistory();
      if (view === "linkedin") loadLinkedInHistory();
      if (view === "research") loadContactResults();
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (canRun && !loading) {
      runChain({ company, domain: selectedDomain, role, highlights });
      setActiveView("research");
      setIsSearchExpanded(false);
    }
  };

  const handleCompanySuggestionSelect = (suggestion: { name: string; domain: string }) => {
    setCompany(suggestion.name);
    setSelectedDomain(suggestion.domain);
    setHasValidCompany(true);
  };

  const handleCompanyChange = (value: string) => {
    setCompany(value);
    if (!value.trim()) {
      setSelectedDomain("");
      setHasValidCompany(false);
    }
  };

  const runChain = useCallback(async (data: { company: string; domain?: string; role: string; highlights: string }) => {
    setSearchData({ ...data, domain: data.domain || "" });
    setLoading(true);
    setError(null);
    setResult(null);
    setIntermediate({});
    setStatus({});
    setLinkedin("");
    setEmail("");
    setEditableEmail("");
    setEditableLinkedin("");
    setPrimaryEmail("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("Failed to run chain");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            const evt: NdEvent = JSON.parse(line);
            if (evt.type === "status") setStatus((s) => ({ ...s, ...evt.data }));
            if (evt.type === "intermediate") {
              setIntermediate((i) => ({ ...i, ...evt.data }));
              if (evt.data.research) {
                setResearchData(evt.data.research);
                const email = extractPrimaryEmail(evt.data.research, contact);
                if (email) setPrimaryEmail(email);
              }
              if (evt.data.verified_points) {
                setVerifiedPoints(evt.data.verified_points);
              }
            }
            if (evt.type === "final") {
              setResult(evt.data);
              
              // Get confidence from research data - use stored researchData which has the actual confidence
              let confidence = 0;
              if (researchData && typeof researchData === 'object' && researchData.confidence) {
                confidence = researchData.confidence;
              } else {
                // If we have plain text research, assume reasonable confidence
                confidence = evt.data.research ? 0.8 : 0;
              }
              
              console.log('Final processing:', {
                company: data.company,
                confidence: confidence,
                threshold: 0.7,
                willGenerate: confidence >= 0.7
              });
              
              // Check confidence before setting email/linkedin content
              if (confidence >= 0.7) {
                setLinkedin(evt.data.outputs.linkedin);
                setEmail(evt.data.outputs.email);
                setEditableEmail(evt.data.outputs.email);
                setEditableLinkedin(evt.data.outputs.linkedin);
                
                // Save to history and trigger real-time updates
                await saveToHistory(data, evt.data.outputs);
              } else {
                console.warn('Confidence too low for generation:', {
                  company: data.company,
                  confidence: confidence
                });
                setError("Company not found. Unable to do research and generate cold email or LinkedIn message.");
              }
              
              setVerifiedPoints(evt.data.verified_points || []);
              setContact(evt.data.contact || null);
              
              // Always save research results to database
              const contactData = {
                company_name: data.company,
                contact_name: evt.data.contact?.name || null,
                contact_title: evt.data.contact?.title || null,
                contact_email: evt.data.contact?.email || null,
                email_inferred: (evt.data.contact as any)?.inferred || false,
                confidence_score: confidence,
                source_url: evt.data.contact?.source?.url || null,
                source_title: evt.data.contact?.source?.title || null,
                research_data: {
                  research: evt.data.research,
                  verified_points: evt.data.verified_points || [],
                  contact: evt.data.contact || null,
                  confidence: confidence,
                  timestamp: new Date().toISOString()
                }
              };
              await saveContactResult(contactData);
              
              // Extract primary email from final data
              const email = extractPrimaryEmail(evt.data.research, evt.data.contact);
              if (email) setPrimaryEmail(email);
            }
            if (evt.type === "error") setError(evt.data.message);
          } catch (err) {
            // ignore malformed lines
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contact, saveContactResult]);
  
  // Load contact results on component mount
  useEffect(() => {
    loadContactResults();
  }, [loadContactResults]);
  


  const saveToHistory = async (searchData: { company: string; role: string; highlights: string }, outputs: { email: string; linkedin: string }) => {
    try {
      // Extract subject line from email
      const emailLines = outputs.email.split('\n');
      const subjectLine = emailLines.find(line => line.toLowerCase().includes('subject:'))?.replace(/subject:\s*/i, '') || `Outreach to ${searchData.company}`;
      
      // Save email and LinkedIn in parallel
      const [emailRes, linkedinRes] = await Promise.all([
        fetch('/api/history/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: searchData.company,
            role: searchData.role,
            subject_line: subjectLine,
            email_content: outputs.email
          })
        }),
        fetch('/api/history/linkedin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: searchData.company,
            role: searchData.role,
            message_content: outputs.linkedin
          })
        })
      ]);
      
      // Real-time updates will be handled by Supabase subscriptions
      if (!emailRes.ok || !linkedinRes.ok) {
        console.error('Failed to save history');
      }
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  const regenerateEmail = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          company: searchData.company, 
          role: searchData.role, 
          highlights: searchData.highlights,
          existingEmail: editableEmail 
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate email");
      const data = await res.json();
      setEmail(data.email);
      setEditableEmail(data.email);
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate email");
    }
  }, [searchData, editableEmail]);

  const regenerateLinkedin = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: searchData.company, role: searchData.role, highlights: searchData.highlights }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setLinkedin(data.linkedin);
      setEditableLinkedin(data.linkedin);
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate");
    }
  }, [searchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state while user data is loading
  if (userLoading) {
    return (
      <div className="min-h-screen gradient-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-blue">
      {/* Left Navigation - Always 64px wide */}
      <div className="fixed left-0 top-0 h-full w-16 bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl z-50">
        <div className="flex flex-col items-center py-4 space-y-3">
          {/* Brand Logo */}
          <div className="mb-4 p-2">
            <div className="text-xs font-bold text-primary text-center leading-tight">
              Outreach<br/>.ai
            </div>
          </div>
          
          {/* Home Icon */}
          <Button
            variant={activeView === "home" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("home")}
            className="h-10 w-10 p-0"
            title="Home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Button>
          
          {/* Search Icon */}
          <Button
            variant={activeView === "search" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("search")}
            className="h-10 w-10 p-0"
            title="Research"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          {/* Email Icon */}
          <Button
            variant={activeView === "email" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("email")}
            className="h-10 w-10 p-0"
            title="Email History"
          >
            <Mail className="h-5 w-5" />
          </Button>
          
          {/* LinkedIn Icon */}
          <Button
            variant={activeView === "linkedin" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("linkedin")}
            className="h-10 w-10 p-0"
            title="LinkedIn History"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          
          {/* Analytics Icon */}
          <Button
            variant={activeView === "analytics" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("analytics")}
            className="h-10 w-10 p-0"
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          
          {/* Settings Icon */}
          <Button
            variant={activeView === "settings" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleNavClick("settings")}
            className="h-10 w-10 p-0"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search Form Overlay */}
      {isSearchExpanded && (
        <div className="fixed left-16 top-0 h-full w-80 bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl z-40">
          <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Company Research</h3>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <CompanyAutocomplete
                  value={company}
                  onChange={handleCompanyChange}
                  onSelect={handleCompanySuggestionSelect}
                  placeholder="Search for a company..."
                  disabled={loading}
                />
                {selectedDomain && (
                  <div className="mt-2 text-sm text-slate-600">
                    Selected: <span className="font-medium">{company}</span> ({selectedDomain})
                  </div>
                )}
                {company && !hasValidCompany && (
                  <div className="mt-2 text-sm text-amber-600">
                    Please select a company from the suggestions to ensure accurate research.
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Target role"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Key Highlights
                </label>
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="Your key skills and experience"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              <Button
                type="submit"
                disabled={loading || !canRun}
                className={cn(
                  "w-full",
                  !hasValidCompany && company && "opacity-50 cursor-not-allowed"
                )}
                title={!hasValidCompany && company ? "Please select a company from the suggestions" : undefined}
              >
                {loading ? "Running..." : "Run AI Agents"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={cn("ml-16 layout-transition", isSearchExpanded && "ml-96")}>
        {/* Dynamic Header */}
        <div className="header-transition">
          <DynamicHeader 
            currentView={activeView}
            userName={user?.full_name}
            onOpenSearch={() => setIsSearchExpanded(true)}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 max-w-6xl mx-auto content-transition min-height-screen">

          
          {/* Email History */}
          {activeView === "email" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Email History</h2>
                <p className="text-slate-600">Your generated cold emails ({emailHistory.length})</p>
              </div>
              <ExpandableHistory 
                items={emailHistory.map(email => ({
                  ...email,
                  type: 'email' as const
                }))}
                type="email"
                loading={historyLoading}
                emptyMessage="No emails generated yet"
              />
            </div>
          )}
          
          {/* LinkedIn History */}
          {activeView === "linkedin" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">LinkedIn History</h2>
                <p className="text-slate-600">Your generated LinkedIn messages ({linkedinHistory.length})</p>
              </div>
              <ExpandableHistory 
                items={linkedinHistory.map(message => ({
                  ...message,
                  type: 'linkedin' as const
                }))}
                type="linkedin"
                loading={historyLoading}
                emptyMessage="No LinkedIn messages generated yet"
              />
            </div>
          )}
          
          {/* Analytics View */}
          {activeView === "analytics" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Outreach Analytics</h2>
                <p className="text-slate-600">Track your outreach performance and activity</p>
              </div>
              <AnalyticsDashboard />
            </div>
          )}
          
          {/* Settings View */}
          {activeView === "settings" && (
            <div className="max-w-md mx-auto py-8">
              <Settings />
            </div>
          )}
          
          {/* Home Dashboard */}
          {activeView === "home" && (
            <Dashboard onStartResearch={() => setIsSearchExpanded(true)} />
          )}
          
          {/* Research View */}
          {activeView === "research" && (
            <div className="space-y-6">
              {/* Show research spinner when loading */}
              {loading && (
                <ResearchSpinner status={status} loading={loading} />
              )}
              
              {/* Show research results if available */}
              {(intermediate.research || verifiedPoints.length > 0 || contact || result) ? (
                <div className="space-y-6">

                  {/* Contact Prospect */}
                  {(contact || primaryEmail) && (
                    <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                          <User className="h-5 w-5" />
                          Contact Prospect
                        </CardTitle>
                        <CardDescription>
                          Key contact identified for outreach
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">
                                {contact?.name || "N/A"}
                              </TableCell>
                              <TableCell>
                                {contact?.title || "N/A"}
                              </TableCell>
                              <TableCell>
                                {contact?.email || primaryEmail || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  onClick={() => copyToClipboard(contact?.email || primaryEmail || "")}
                                  variant="outline"
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 shadow-md hover:shadow-lg"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Error Display */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Error:</strong> {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Research Results Card */}
                  {(intermediate.research || verifiedPoints.length > 0 || contact) && (
                    <Card className="shadow-lg bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                          <Search className="h-5 w-5" />
                          Research Results
                        </CardTitle>
                        <CardDescription>
                          AI-powered company insights and key contact information
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                      <div className="space-y-6">
                        {contact && (
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center gap-2 font-semibold text-primary mb-2">
                              <User className="h-4 w-4" />
                              Key Contact Identified
                            </div>
                            <div className="space-y-1">
                              <div><strong>{contact.name}</strong> - {contact.title}</div>
                              {contact.email && (
                                <div><a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a></div>
                              )}
                              {contact.source?.url && (
                                <div><a href={contact.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Profile</a></div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {intermediate.research && (
                          <div>
                            <h4 className="text-lg font-semibold text-primary mb-4 pb-2 border-b">
                              Company Research Findings
                            </h4>
                            <div className="mb-4">
                              {renderResearchContent(intermediate.research)}
                            </div>
                          </div>
                        )}
                        
                        {verifiedPoints.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-primary mb-4 pb-2 border-b">
                              Verified Research Points
                            </h4>
                            <div className="space-y-3">
                              {verifiedPoints.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className="insight-bullet-modern mt-2" />
                                  <div className="flex-1">
                                    <span className="text-slate-800">{point.claim}</span>
                                    {point.source?.url && (
                                      <SourceLink 
                                        url={point.source.url} 
                                        title={point.source.title}
                                      />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!intermediate.research && !verifiedPoints.length && !contact && (
                          <div className="text-center p-8 text-muted-foreground italic">
                            {loading ? "Researching company and role..." : "Research results will appear here..."}
                          </div>
                        )}
                      </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cold Email Card */}
                  {(email || (loading && status.messaging)) && (
                    <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                          <Mail className="h-5 w-5" />
                          Cold Email
                        </CardTitle>
                        <CardDescription>
                          AI-generated personalized email ready to send
                        </CardDescription>
                        {email && (
                          <CardAction>
                            <Button
                              onClick={regenerateEmail}
                              disabled={loading || !canRun}
                              variant="outline"
                              size="sm"
                              className="ml-auto bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 shadow-md hover:shadow-lg"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate
                            </Button>
                          </CardAction>
                        )}
                      </CardHeader>
                      <CardContent>
                      {email ? (
                        <Textarea
                          value={editableEmail}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableEmail(e.target.value)}
                          placeholder="Your personalized cold email will appear here..."
                          className="min-h-[200px] border-blue-200 focus:border-blue-400"
                        />
                      ) : (
                        <div className="text-center p-8 text-muted-foreground italic">
                          Generating personalized email...
                        </div>
                      )}
                      </CardContent>
                    </Card>
                  )}

                  {/* LinkedIn Message Card */}
                  {(linkedin || (loading && status.messaging && email)) && (
                    <Card className="shadow-lg bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-900">
                          <MessageSquare className="h-5 w-5" />
                          LinkedIn Message
                        </CardTitle>
                        <CardDescription>
                          Professional networking message optimized for LinkedIn
                        </CardDescription>
                        {linkedin && (
                          <CardAction className="gap-2">
                            <Button
                              onClick={regenerateLinkedin}
                              disabled={loading || !canRun}
                              variant="outline"
                              size="sm"
                              className="bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 text-purple-800 shadow-md hover:shadow-lg"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate
                            </Button>
                            <Button
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/rephrase", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ linkedin: editableLinkedin }),
                                  });
                                  if (!res.ok) throw new Error("Failed to rephrase");
                                  const data = await res.json();
                                  setLinkedin(data.linkedin);
                                  setEditableLinkedin(data.linkedin);
                                } catch (e: any) {
                                  setError(e?.message || "Failed to rephrase");
                                }
                              }}
                              disabled={loading || !linkedin}
                              variant="outline"
                              size="sm"
                              className="bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-800 shadow-md hover:shadow-lg"
                            >
                              <Scissors className="h-4 w-4 mr-2" />
                              22 words Rephrase
                            </Button>
                          </CardAction>
                        )}
                      </CardHeader>
                      <CardContent>
                      {linkedin ? (
                        <Textarea
                          value={editableLinkedin}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableLinkedin(e.target.value)}
                          placeholder="Your LinkedIn message will appear here..."
                          className="min-h-[150px] border-purple-200 focus:border-purple-400"
                        />
                      ) : (
                        <div className="text-center p-8 text-muted-foreground italic">
                          Generating LinkedIn message...
                        </div>
                      )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-slate-700 mb-2">Start Company Research</h2>
                  <p className="text-slate-500 mb-6">Use the search panel to research companies and generate personalized outreach messages.</p>
                  <Button onClick={() => setIsSearchExpanded(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="h-4 w-4 mr-2" />
                    Open Research Panel
                  </Button>
                </div>
              )}
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
}