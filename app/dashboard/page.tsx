"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { SourceLink } from "../../components/ui/source-link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Textarea } from "../../components/ui/textarea";
import { Copy, Mail, MessageSquare, RefreshCw, Scissors, Search, User, Settings as SettingsIcon, BarChart3, FileText, ToggleLeft, ToggleRight, X } from "lucide-react";
import { signOut } from "../../lib/supabase";
import { supabase } from "../../lib/supabase";
import { cn, sanitizeMessageContent } from "../../lib/utils";
import { CompanyAutocomplete } from "../../components/ui/company-autocomplete";
import { Settings } from "../../components/ui/settings";
import { AnalyticsDashboard } from "../../components/ui/analytics-dashboard";
import { ToneSelector } from "../../components/ui/tone-selector";
import { WritingTone, getDefaultTone } from "../../lib/tones";
import { KPIDashboard } from "../../components/ui/kpi-dashboard";
import { ExpandableHistory } from "../../components/ui/expandable-history";
import { ContactResultsTable } from "../../components/ui/contact-results-table";
import { DynamicHeader } from "../../components/ui/dynamic-header";
import { Dashboard } from "../../components/ui/dashboard";
import { useUser } from "../../hooks/useUser";
import { ToastProvider } from "../../components/ui/toast";
import { ResearchSpinner } from "../../components/ui/research-spinner";
import { CompanyLink } from "../../components/ui/company-link";
import { ResearchOutput } from "../../components/ui/research-output";
import { ResumeUpload } from "../../components/ui/resume-upload";
import { getUserResumeData, formatResumeForMessaging } from "../../lib/resumeUtils";

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
  total_count?: number;
  all_emails?: EmailHistory[];
}

interface LinkedInHistory {
  id: string;
  company_name: string;
  role: string;
  content: string;
  created_at: string;
  total_count?: number;
  all_messages?: LinkedInHistory[];
}

export default function HomePage() {
  const { user, loading: userLoading } = useUser();
  
  const [activeView, setActiveView] = useState<"home" | "search" | "email" | "linkedin" | "research" | "analytics" | "settings">("home");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Resume states
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [resumeData, setResumeData] = useState<{ url: string; filename: string; content: string; useInPersonalization: boolean } | null>(null);
  const [resumeRefreshTrigger, setResumeRefreshTrigger] = useState(0);
  
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

  const [searchData, setSearchData] = useState({ company: "", domain: "", role: "", highlights: "" });
  const [company, setCompany] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [role, setRole] = useState("");
  const [highlights, setHighlights] = useState("");
  const [hasValidCompany, setHasValidCompany] = useState(false);
  
  // Company URL fallback states
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [companyUrl, setCompanyUrl] = useState("");
  const [urlSearchError, setUrlSearchError] = useState<string | null>(null);
  
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [linkedinHistory, setLinkedinHistory] = useState<LinkedInHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [contactResults, setContactResults] = useState<any[]>([]);
  
  // Regeneration loading states
  const [regeneratingEmail, setRegeneratingEmail] = useState(false);
  const [regeneratingLinkedin, setRegeneratingLinkedin] = useState(false);
  const [rephrasingLinkedin, setRephrasingLinkedin] = useState(false);
  
  // Tone settings - separate states for each context
  const [searchTone, setSearchTone] = useState<WritingTone>(getDefaultTone());
  const [emailTone, setEmailTone] = useState<WritingTone>(getDefaultTone());
  const [linkedinTone, setLinkedinTone] = useState<WritingTone>(getDefaultTone());
  
  const canRun = useMemo(() => hasValidCompany && !!role && !!highlights, [hasValidCompany, role, highlights]);
  const abortRef = useRef<AbortController | null>(null);
  const supabaseClient = useMemo(() => supabase, []);
  
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const setupSubscriptions = () => {
      try {
        const emailChannel = supabaseClient
          .channel('email_history_changes')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'email_history' },
            (payload: any) => {
              const newEmail = payload.new as EmailHistory;
              setEmailHistory(prev => {
                if (prev.some(email => email.id === newEmail.id)) return prev;
                return [newEmail, ...prev];
              });
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(setupSubscriptions, 1000 * retryCount);
            }
          });
          
        const linkedinChannel = supabaseClient
          .channel('linkedin_history_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'linkedin_history' },
            (payload: any) => {
              const newMessage = payload.new as LinkedInHistory;
              setLinkedinHistory(prev => {
                if (prev.some(msg => msg.id === newMessage.id)) return prev;
                return [newMessage, ...prev];
              });
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIPTION_ERROR' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(setupSubscriptions, 1000 * retryCount);
            }
          });
          
        const contactChannel = supabaseClient
          .channel('contact_results_changes')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'contact_results' },
            (payload: any) => {
              const newContact = payload.new;
              setContactResults(prev => {
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
  }, [supabaseClient]);

  // Resume data loading and handlers
  // State synchronization: Both search panel and ResumeViewer component can toggle resume usage
  // The main page state (resumeData) is the source of truth for the search panel
  // The ResumeViewer component has its own internal state but notifies the parent via onResumeSettingsChange
  // Both use the same handleResumeSettingsChange function to maintain consistency
  const loadResumeData = async () => {
    if (!user) return;
    const data = await getUserResumeData(user.id);
    setResumeData(data);
  };

  useEffect(() => {
    if (user) loadResumeData();
  }, [user]);

  const handleResumeUploadSuccess = (data: { url: string; filename: string; content: string }) => {
    setResumeModalOpen(false);
    loadResumeData();
    setResumeRefreshTrigger(prev => prev + 1); // Trigger ResumeViewer refresh
  };

  const handleResumeDeleted = () => {
    loadResumeData(); // Refresh the main dashboard resume state
    setResumeRefreshTrigger(prev => prev + 1); // Trigger ResumeViewer refresh
  };

  const handleResumeSettingsChange = async (useResume: boolean, content: string | null) => {
    // Update the local state immediately for instant UI feedback
    setResumeData(prev => prev ? { ...prev, useInPersonalization: useResume } : prev);
    
    // Persist the change to the database
    if (user) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({ use_resume_in_personalization: useResume })
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Failed to update resume personalization setting:', error);
          // Revert the local state if database update fails
          setResumeData(prev => prev ? { ...prev, useInPersonalization: !useResume } : prev);
          return;
        }
      } catch (error) {
        console.error('Error updating resume settings:', error);
        // Revert the local state if database update fails
        setResumeData(prev => prev ? { ...prev, useInPersonalization: !useResume } : prev);
        return;
      }
    }
    
    // No need to trigger ResumeViewer refresh - parentResumeState prop handles immediate sync
    // The ResumeViewer will automatically update via the parentResumeState prop change
  };

  const extractPrimaryEmail = (researchData: any, contactData: any) => {
    if (contactData?.email) return contactData.email;
    
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const researchText = typeof researchData === 'string' ? researchData : JSON.stringify(researchData);
    const emails = researchText.match(emailRegex);
    
    if (emails && emails.length > 0) {
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

  const handleEmailDeleted = (deletedId: string) => {
    setEmailHistory(prev => {
      return prev.map(group => {
        if (group.all_emails) {
          // This is a grouped item - remove the deleted email from the group
          const updatedEmails = group.all_emails.filter(email => email.id !== deletedId);
          
          if (updatedEmails.length === 0) {
            // If no emails left, this group should be removed
            return null;
          }
          
          // Update the group with the remaining emails
          const latestEmail = updatedEmails[0]; // Already sorted by date desc
          return {
            ...latestEmail,
            total_count: updatedEmails.length,
            all_emails: updatedEmails,
          };
        } else {
          // This is a single item - remove if it matches the deleted ID
          return group.id === deletedId ? null : group;
        }
      }).filter(Boolean) as typeof prev; // Remove null entries
    });
  };

  const handleLinkedInDeleted = (deletedId: string) => {
    setLinkedinHistory(prev => {
      return prev.map(group => {
        if (group.all_messages) {
          // This is a grouped item - remove the deleted message from the group
          const updatedMessages = group.all_messages.filter(message => message.id !== deletedId);
          
          if (updatedMessages.length === 0) {
            // If no messages left, this group should be removed
            return null;
          }
          
          // Update the group with the remaining messages
          const latestMessage = updatedMessages[0]; // Already sorted by date desc
          return {
            ...latestMessage,
            total_count: updatedMessages.length,
            all_messages: updatedMessages,
          };
        } else {
          // This is a single item - remove if it matches the deleted ID
          return group.id === deletedId ? null : group;
        }
      }).filter(Boolean) as typeof prev; // Remove null entries
    });
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
  
  const refreshEmailHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history/emails');
      if (res.ok) {
        const data = await res.json();
        setEmailHistory(data);
      }
    } catch (error) {
      console.error('Failed to refresh email history:', error);
    }
  }, []);
  
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

  const refreshLinkedInHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history/linkedin');
      if (res.ok) {
        const data = await res.json();
        setLinkedinHistory(data);
      }
    } catch (error) {
      console.error('Failed to refresh LinkedIn history:', error);
    }
  }, []);
  
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
      runChain({ company, domain: selectedDomain, role, highlights, tone: searchTone });
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
    setShowUrlFallback(false); // Reset URL fallback when user types
    setUrlSearchError(null);
    if (!value.trim()) {
      setSelectedDomain("");
      setHasValidCompany(false);
    } else {
      // Consider any non-empty company name as valid
      setHasValidCompany(true);
    }
  };

  const extractCompanyFromUrl = (url: string): { name: string; domain: string } => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Extract company name from domain
      const domainParts = domain.split('.');
      const companyName = domainParts[0];
      
      // Capitalize first letter
      const formattedName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
      
      return { name: formattedName, domain };
    } catch (error) {
      throw new Error("Invalid URL format. Please enter a valid company website URL.");
    }
  };

  const handleUrlSearch = () => {
    setUrlSearchError(null);
    try {
      const { name, domain } = extractCompanyFromUrl(companyUrl);
      setCompany(name);
      setSelectedDomain(domain);
      setHasValidCompany(true);
      setShowUrlFallback(false);
      setCompanyUrl("");
      
      // Auto-run the search if other fields are filled
      if (role && highlights) {
        runChain({ company: name, domain, role, highlights, tone: searchTone });
        setActiveView("research");
        setIsSearchExpanded(false);
      }
    } catch (error: any) {
      setUrlSearchError(error.message);
    }
  };

  const runChain = useCallback(async (data: { company: string; domain?: string; role: string; highlights: string; tone?: WritingTone }) => {
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
      // Add resume content and toggle to API call
      const resumeContent = resumeData?.useInPersonalization ? formatResumeForMessaging(resumeData.content) : undefined;
      const useResumeInPersonalization = resumeData?.useInPersonalization || false;
      
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...data, 
          resumeContent, 
          useResumeInPersonalization 
        }),
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
                // Extract email from research data (handle both string and structured formats)
                const researchText = typeof evt.data.research === 'string' 
                  ? evt.data.research 
                  : (typeof evt.data.research === 'object' && 'summary' in evt.data.research && typeof (evt.data.research as any).summary === 'string'
                      ? (evt.data.research as any).summary
                      : (typeof evt.data.research === 'object' && evt.data.research.company_overview 
                          ? evt.data.research.company_overview 
                          : JSON.stringify(evt.data.research)));
                const email = extractPrimaryEmail(researchText, contact);
                if (email) setPrimaryEmail(email);
              }
              if (evt.data.verified_points) {
                setVerifiedPoints(evt.data.verified_points);
              }
            }
            if (evt.type === "final") {
              setResult(evt.data);
              
              let confidence = 0;
              
              // First check if we have successful outputs (LinkedIn and email)
              if (evt.data.outputs && evt.data.outputs.linkedin && evt.data.outputs.email) {
                confidence = 0.8; // If we have successful outputs, we should have good confidence
              }
              
              // Then try to get more precise confidence from research data
              if (researchData && typeof researchData === 'object') {
                if (researchData.confidence_assessment && researchData.confidence_assessment.level) {
                  const level = researchData.confidence_assessment.level.toLowerCase();
                  if (level === "high") confidence = 1.0;
                  else if (level === "medium") confidence = 0.8;
                  else if (level === "low") confidence = 0.5;
                } else if (researchData.contact_information && typeof researchData.contact_information.confidence_score === "number") {
                  confidence = researchData.contact_information.confidence_score;
                } else if (researchData.company_overview) {
                  // If we have company overview, that's a good sign
                  confidence = Math.max(confidence, 0.8);
                }
              }
              
              // Fallback: if we have research data, assume reasonable confidence
              if (confidence === 0 && evt.data.research) {
                confidence = 0.8;
              }
              
              if (confidence >= 0.7) {
                // Apply UI guardrails to sanitize message content
                const sanitizedLinkedIn = sanitizeMessageContent(evt.data.outputs.linkedin);
                const sanitizedEmail = sanitizeMessageContent(evt.data.outputs.email);
                
                setLinkedin(sanitizedLinkedIn);
                setEmail(sanitizedEmail);
                setEditableEmail(sanitizedEmail);
                setEditableLinkedin(sanitizedLinkedIn);
                
                // History is automatically saved by the orchestrator
                // Refresh history to show updated groupings after a short delay
                setTimeout(() => {
                  refreshEmailHistory();
                  refreshLinkedInHistory();
                }, 1000);
              } else {
                setError("Company not found. Unable to do research and generate cold email or LinkedIn message.");
                setShowUrlFallback(true); // Show URL fallback when confidence is low
              }
              
              setVerifiedPoints(evt.data.verified_points || []);
              setContact(evt.data.contact || null);
              
              // Extract contact info from either new two-contact structure or legacy single contact
              let primaryContactInfo = null;
              const contactAny = evt.data.contact as any;
              
              // Helper function to check if a value is valid (not N/A, empty, etc.)
              const isValidContactValue = (value: string | null | undefined) => {
                if (!value || value.trim() === '') return false;
                if (value === "N/A" || value === "n/a") return false;
                if (value.toLowerCase().includes("not available")) return false;
                if (value.toLowerCase().includes("no publicly available")) return false;
                return true;
              };
              
              if (contactAny?.primary_contact && (isValidContactValue(contactAny.primary_contact.name) || isValidContactValue(contactAny.primary_contact.title))) {
                // New two-contact structure - use primary contact
                primaryContactInfo = contactAny.primary_contact;
              } else if (contactAny?.secondary_contact && (isValidContactValue(contactAny.secondary_contact.name) || isValidContactValue(contactAny.secondary_contact.title))) {
                // Only secondary contact available or primary is invalid - use secondary as primary for saving
                primaryContactInfo = contactAny.secondary_contact;
              } else if (isValidContactValue(contactAny?.name) || isValidContactValue(contactAny?.title) || isValidContactValue(contactAny?.email)) {
                // Legacy single contact structure
                primaryContactInfo = contactAny;
              }
              
              const contactData = {
                company_name: data.company,
                contact_name: isValidContactValue(primaryContactInfo?.name) ? primaryContactInfo.name : null,
                contact_title: isValidContactValue(primaryContactInfo?.title) ? primaryContactInfo.title : null,
                contact_email: isValidContactValue(primaryContactInfo?.email) ? primaryContactInfo.email : null,
                email_inferred: primaryContactInfo?.inferred || false,
                confidence_score: confidence,
                source_url: primaryContactInfo?.source?.url || null,
                source_title: primaryContactInfo?.source?.title || null,
                research_data: {
                  research: typeof evt.data.research === 'string' 
                    ? evt.data.research 
                    : (typeof evt.data.research === 'object' && 'summary' in evt.data.research && typeof (evt.data.research as any).summary === 'string'
                        ? (evt.data.research as any).summary
                        : JSON.stringify(evt.data.research)),
                  verified_points: evt.data.verified_points || [],
                  contact: evt.data.contact || null,
                  confidence: confidence,
                  timestamp: new Date().toISOString()
                }
              };
              await saveContactResult(contactData);
              
              const email = extractPrimaryEmail(
                typeof evt.data.research === 'string' 
                  ? evt.data.research 
                  : (typeof evt.data.research === 'object' && 'summary' in evt.data.research && typeof (evt.data.research as any).summary === 'string'
                      ? (evt.data.research as any).summary
                      : JSON.stringify(evt.data.research)), 
                primaryContactInfo // Use the extracted primary contact info
              );
              if (email) setPrimaryEmail(email);
            }
            if (evt.type === "error") {
              const errorMessage = evt.data.message;
              setError(errorMessage);
              
              // Check if this is a "company not found" error and show URL fallback
              if (errorMessage.toLowerCase().includes("company not found") || 
                  errorMessage.toLowerCase().includes("unable to do research")) {
                setShowUrlFallback(true);
              }
            }
          } catch (err) {
            // ignore malformed lines
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        const errorMessage = e?.message || "Unknown error";
        setError(errorMessage);
        
        // Check if this is a company not found error
        if (errorMessage.toLowerCase().includes("company not found") || 
            errorMessage.toLowerCase().includes("failed to fetch") ||
            errorMessage.toLowerCase().includes("unable to research")) {
          setShowUrlFallback(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [contact, saveContactResult, researchData, resumeData]);
  
  useEffect(() => {
    loadContactResults();
  }, [loadContactResults]);

  const regenerateEmail = useCallback(async () => {
    setRegeneratingEmail(true);
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          company: searchData.company, 
          role: searchData.role, 
          highlights: searchData.highlights,
          tone: emailTone,
          existingEmail: editableEmail 
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate email");
      const data = await res.json();
      const sanitizedEmail = sanitizeMessageContent(data.email);
      setEmail(sanitizedEmail);
      setEditableEmail(sanitizedEmail);
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate email");
    } finally {
      setRegeneratingEmail(false);
    }
  }, [searchData, emailTone, editableEmail]);

  const regenerateLinkedin = useCallback(async () => {
    setRegeneratingLinkedin(true);
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          company: searchData.company, 
          role: searchData.role, 
          highlights: searchData.highlights,
          tone: linkedinTone
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      const sanitizedLinkedIn = sanitizeMessageContent(data.linkedin);
      setLinkedin(sanitizedLinkedIn);
      setEditableLinkedin(sanitizedLinkedIn);
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate");
    } finally {
      setRegeneratingLinkedin(false);
    }
  }, [searchData, linkedinTone]);

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
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="fixed left-0 top-0 h-full w-12 sm:w-16 bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl z-50">
          <div className="flex flex-col items-center py-2 sm:py-4 space-y-2 sm:space-y-3">
            <div className="mb-2 sm:mb-4 p-1 sm:p-2">
              <div className="text-xs sm:text-xs font-bold text-primary text-center leading-tight">
                Outreach
              </div>
            </div>
            
            <Button
              variant={activeView === "home" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("home")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="Home"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Button>
            
            <Button
              variant={activeView === "search" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("search")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="Research"
            >
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant={activeView === "email" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("email")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="Email History"
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant={activeView === "linkedin" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("linkedin")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="LinkedIn History"
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant={activeView === "analytics" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("analytics")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="Analytics"
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResumeModalOpen(true)}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title={resumeData ? `Resume: ${resumeData.filename}` : "Upload Resume"}
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant={activeView === "settings" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavClick("settings")}
              className="h-8 w-8 sm:h-10 sm:w-10 p-0"
              title="Settings"
            >
              <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {isSearchExpanded && (
          <>
            {/* Mobile backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsSearchExpanded(false)}
            />
            
            <div className="fixed left-0 md:left-12 lg:left-16 top-0 h-full w-full max-w-sm md:w-80 lg:w-96 bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl z-50">
              {/* Mobile header with close button */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200/50 md:hidden">
                <h2 className="text-lg font-semibold text-slate-800">Research</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSearchExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="h-full overflow-y-auto pb-20 md:pb-6">
                <div className="p-3 md:p-4 lg:p-6">
                  <form onSubmit={handleSearch} className="space-y-3 md:space-y-4">
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
                        className="text-sm"
                      />
                      {selectedDomain && (
                        <div className="mt-2 text-xs text-slate-600">
                          Selected: <span className="font-medium">{company}</span> ({selectedDomain})
                        </div>
                      )}
                      {company && !selectedDomain && (
                        <div className="mt-2 text-xs text-blue-600">
                          Using manual entry: <span className="font-medium">{company}</span>
                        </div>
                      )}
                      
                      {/* URL Fallback Section */}
                      {showUrlFallback && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="mb-2">
                            <p className="text-sm text-amber-800 font-medium">
                              Company not found in our database
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Please provide the exact company website URL for better research:
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={companyUrl}
                              onChange={(e) => setCompanyUrl(e.target.value)}
                              placeholder="https://company.com"
                              className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <button
                              type="button"
                              onClick={handleUrlSearch}
                              disabled={!companyUrl.trim()}
                              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              Use URL
                            </button>
                          </div>
                          {urlSearchError && (
                            <p className="text-xs text-red-600 mt-2">{urlSearchError}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowUrlFallback(false)}
                            className="text-xs text-amber-700 hover:text-amber-800 mt-2 underline"
                          >
                            Cancel
                          </button>
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
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* Resume Personalization */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Resume Personalization
                      </label>
                      {resumeData ? (
                        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 rounded-full bg-blue-100">
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800">Use Resume</p>
                                <p className="text-xs text-slate-600 truncate">{resumeData.filename}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResumeSettingsChange(!resumeData.useInPersonalization, resumeData.content)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200 ${
                                resumeData.useInPersonalization 
                                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                              title={`${resumeData.useInPersonalization ? 'Disable' : 'Enable'} resume in personalization`}
                            >
                              {resumeData.useInPersonalization ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                              <span className="text-xs font-semibold">
                                {resumeData.useInPersonalization ? 'ON' : 'OFF'}
                              </span>
                            </button>
                          </div>
                          {resumeData.useInPersonalization && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <p className="text-xs text-green-700 font-medium">
                                Messages will be personalized using your resume
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 rounded-full bg-slate-100">
                                <FileText className="h-3.5 w-3.5 text-slate-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-600">No Resume Uploaded</p>
                                <p className="text-xs text-slate-500">Upload a resume to enable personalization</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setResumeModalOpen(true)}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Writing Tone
                      </label>
                      <ToneSelector
                        selectedTone={searchTone}
                        onToneChange={setSearchTone}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-10 text-sm"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={loading || !canRun}
                      className="w-full h-11 text-base font-medium"
                    >
                      {loading ? "Running..." : "Run AI Agents"}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={cn(
          "transition-all duration-300 ease-in-out",
          "ml-12 sm:ml-16",
          isSearchExpanded && "md:ml-76 lg:ml-96"
        )}>
          <div className="header-transition">
            <DynamicHeader 
              currentView={activeView}
              userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              onOpenSearch={() => setIsSearchExpanded(true)}
            />
          </div>

          <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto content-transition min-height-screen">
            {activeView === "email" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Email History</h2>
                  <p className="text-sm sm:text-base text-slate-600">Your generated cold emails ({emailHistory.length})</p>
                </div>
                <ExpandableHistory 
                  items={emailHistory.map(email => ({
                    ...email,
                    type: 'email' as const,
                    all_emails: email.all_emails?.map(subEmail => ({
                      ...subEmail,
                      type: 'email' as const
                    })) as any
                  }))}
                  type="email"
                  loading={historyLoading}
                  emptyMessage="No emails generated yet"
                  onItemDeleted={handleEmailDeleted}
                />
              </div>
            )}
            
            {activeView === "linkedin" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">LinkedIn History</h2>
                  <p className="text-sm sm:text-base text-slate-600">Your generated LinkedIn messages ({linkedinHistory.length})</p>
                </div>
                <ExpandableHistory 
                  items={linkedinHistory.map(message => ({
                    ...message,
                    type: 'linkedin' as const,
                    all_messages: message.all_messages?.map(subMessage => ({
                      ...subMessage,
                      type: 'linkedin' as const
                    })) as any
                  }))}
                  type="linkedin"
                  loading={historyLoading}
                  emptyMessage="No LinkedIn messages generated yet"
                  onItemDeleted={handleLinkedInDeleted}
                />
              </div>
            )}
            
            {activeView === "analytics" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Outreach Analytics</h2>
                  <p className="text-sm sm:text-base text-slate-600">Track your outreach performance and activity</p>
                </div>
                <AnalyticsDashboard />
              </div>
            )}
            
            {activeView === "settings" && (
              <div className="max-w-sm sm:max-w-md mx-auto py-6 sm:py-8">
                <Settings />
              </div>
            )}
            
            {activeView === "home" && (
              <Dashboard 
                onStartResearch={() => setIsSearchExpanded(true)}
                onNavigateToAnalytics={() => handleNavClick("analytics")}
                onNavigateToEmailHistory={() => handleNavClick("email")}
                onNavigateToLinkedInHistory={() => handleNavClick("linkedin")}
                onResumeUploadClick={() => setResumeModalOpen(true)}
                onResumeSettingsChange={handleResumeSettingsChange}
                showResumeViewer={true}
                resumeRefreshTrigger={resumeRefreshTrigger}
                onResumeDeleted={handleResumeDeleted}
                parentResumeState={resumeData ? {
                  useInPersonalization: resumeData.useInPersonalization,
                  filename: resumeData.filename
                } : null}
              />
            )}
            
            {activeView === "research" && (
              <div className="space-y-4 sm:space-y-6">
                {loading && (
                  <ResearchSpinner status={status} loading={loading} />
                )}
                
                {(intermediate.research || verifiedPoints.length > 0 || contact || result) ? (
                  <div className="space-y-4 sm:space-y-6">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          <strong>Error:</strong> {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {intermediate.research && (
                      <ResearchOutput
                        content={intermediate.research}
                        contact={contact || undefined}
                        onCopyEmail={copyToClipboard}
                      />
                    )}

                    {(email || (loading && status.messaging)) && (
                      <Card className="shadow-lg bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-900 text-lg sm:text-xl">
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                            Cold Email
                          </CardTitle>
                          <CardDescription className="text-sm">
                            AI-generated personalized email ready to send
                          </CardDescription>
                          {email && (
                            <CardAction className="gap-1 sm:gap-2 flex-wrap">
                              <ToneSelector
                                selectedTone={emailTone}
                                onToneChange={setEmailTone}
                                disabled={loading}
                                size="sm"
                                variant="outline"
                              />
                              <Button
                                onClick={regenerateEmail}
                                disabled={loading || !canRun || regeneratingEmail}
                                variant="outline"
                                size="sm"
                                className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 shadow-md hover:shadow-lg text-xs sm:text-sm h-8 sm:h-9"
                              >
                                {regeneratingEmail ? (
                                  <div className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">{regeneratingEmail ? 'Regenerating...' : 'Regenerate'}</span>
                                <span className="sm:hidden">{regeneratingEmail ? 'Gen...' : 'Regen'}</span>
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

                    {(linkedin || (loading && status.messaging && email)) && (
                      <Card className="shadow-lg bg-gradient-to-br from-purple-50/50 to-indigo-50/50">
                        <CardHeader className="space-y-2 sm:space-y-3">
                          <CardTitle className="flex items-center gap-2 text-purple-900 text-lg sm:text-xl">
                            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                            LinkedIn Message
                          </CardTitle>
                          <CardDescription className="text-sm sm:text-base">
                            Professional networking message optimized for LinkedIn
                          </CardDescription>
                          {linkedin && (
                            <CardAction className="gap-1 sm:gap-2 flex-wrap">
                              <ToneSelector
                                selectedTone={linkedinTone}
                                onToneChange={setLinkedinTone}
                                disabled={loading}
                                size="sm"
                                variant="outline"
                              />
                              <Button
                                onClick={regenerateLinkedin}
                                disabled={loading || !canRun || regeneratingLinkedin}
                                variant="outline"
                                size="sm"
                                className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg text-xs sm:text-sm h-8 sm:h-9 min-w-[80px] sm:min-w-[120px]"
                              >
                                {regeneratingLinkedin ? (
                                  <div className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">{regeneratingLinkedin ? 'Regenerating...' : 'Regenerate'}</span>
                                <span className="sm:hidden">{regeneratingLinkedin ? 'Gen...' : 'Regen'}</span>
                              </Button>
                              <Button
                                onClick={async () => {
                                  setRephrasingLinkedin(true);
                                  try {
                                    const res = await fetch("/api/rephrase", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ 
                                        linkedin: editableLinkedin, 
                                        tone: linkedinTone,
                                        type: "22words"
                                      }),
                                    });
                                    if (!res.ok) throw new Error("Failed to rephrase");
                                    const data = await res.json();
                                    const sanitizedLinkedIn = sanitizeMessageContent(data.linkedin);
                                    setLinkedin(sanitizedLinkedIn);
                                    setEditableLinkedin(sanitizedLinkedIn);
                                  } catch (e: any) {
                                    setError(e?.message || "Failed to rephrase");
                                  } finally {
                                    setRephrasingLinkedin(false);
                                  }
                                }}
                                disabled={loading || !linkedin || rephrasingLinkedin}
                                variant="outline"
                                size="sm"
                                className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-800 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg text-xs sm:text-sm h-8 sm:h-9 min-w-[60px] sm:min-w-[140px]"
                              >
                                {rephrasingLinkedin ? (
                                  <div className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin rounded-full border-2 border-blue-800 border-t-transparent" />
                                ) : (
                                  <Scissors className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">{rephrasingLinkedin ? 'Rephrasing...' : '22 words Rephrase'}</span>
                                <span className="sm:hidden">{rephrasingLinkedin ? 'Rep...' : '22w'}</span>
                              </Button>
                            </CardAction>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                        {linkedin ? (
                          <Textarea
                            value={editableLinkedin}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableLinkedin(e.target.value)}
                            placeholder="Your LinkedIn message will appear here..."
                            className="min-h-[120px] sm:min-h-[150px] border-purple-200 focus:border-purple-400 resize-none"
                          />
                        ) : (
                          <div className="text-center p-6 sm:p-8 text-muted-foreground italic">
                            Generating LinkedIn message...
                          </div>
                        )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        
        {/* Resume Upload Modal */}
        <ResumeUpload 
          isOpen={resumeModalOpen} 
          onClose={() => setResumeModalOpen(false)} 
          onUploadSuccess={handleResumeUploadSuccess} 
        />
      </div>
    </ToastProvider>
  );
}