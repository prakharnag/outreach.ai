"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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

export default function HomePage() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [highlights, setHighlights] = useState("");
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

  const canRun = useMemo(() => !!company && !!role && !!highlights, [company, role, highlights]);
  const abortRef = useRef<AbortController | null>(null);

  // Human-readable research content renderer
  const renderResearchContent = (content: string) => {
    if (!content) return null;
    
    let data: any = {};
    try {
      data = JSON.parse(content);
    } catch (e) {
      // Try to fix common JSON truncation issues
      let fixedContent = content;
      
      // If it ends with incomplete string, try to close it
      if (content.includes('"') && !content.endsWith('"')) {
        fixedContent = content + '"';
      }
      
      // If missing closing braces, try to add them
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        fixedContent = content + '}'.repeat(openBraces - closeBraces);
      }
      
      try {
        data = JSON.parse(fixedContent);
      } catch {
        // If still can't parse, extract readable text manually
        const summaryMatch = content.match(/"summary"\s*:\s*"([^"]*)"/)?.[1];
        const claimsMatches = [...content.matchAll(/"claim"\s*:\s*"([^"]*)"/g)];
        
        return (
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #F8F6F0 0%, #F4E4BC 100%)',
            borderRadius: '0.75rem',
            border: '1px solid #D4A574'
          }}>
            {summaryMatch && (
              <div style={{
                fontWeight: 'bold',
                fontSize: '1.1rem',
                marginBottom: '1.5rem',
                color: '#8B5A3C'
              }}>
                {summaryMatch}
              </div>
            )}
            
            {claimsMatches.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {claimsMatches.map((match, idx) => (
                  <li key={idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#8B5A3C',
                      marginTop: '0.5rem',
                      flexShrink: 0
                    }} />
                    <span style={{ color: '#2D2D2D' }}>{match[1]}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {!summaryMatch && claimsMatches.length === 0 && (
              <div style={{ color: '#6B7280', fontStyle: 'italic' }}>
                Research in progress...
              </div>
            )}
          </div>
        );
      }
    }

    // Deduplicate sources by URL
    const deduplicateSources = (sources: any[]) => {
      const seen = new Set<string>();
      return sources.filter(source => {
        const url = source?.url;
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      });
    };

    const uniquePointSources = data.points ? deduplicateSources(
      data.points.map((p: any) => p.source).filter(Boolean)
    ) : [];
    
    const globalSources = data.sources ? deduplicateSources(data.sources) : [];

    return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #F8F6F0 0%, #F4E4BC 100%)',
        borderRadius: '0.75rem',
        border: '1px solid #D4A574'
      }}>
        {/* Summary */}
        {data.summary && (
          <div style={{
            fontWeight: 'bold',
            fontSize: '1.1rem',
            marginBottom: '1.5rem',
            color: '#8B5A3C'
          }}>
            {data.summary}
          </div>
        )}
        
        {/* Points */}
        {data.points && Array.isArray(data.points) && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.points.map((point: any, idx: number) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                marginBottom: '1rem',
                animation: `fadeInUp 0.5s ease-out ${idx * 0.1}s both`
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#8B5A3C',
                  marginTop: '0.5rem',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#2D2D2D' }}>{point.claim}</span>
                  {point.source && (
                    <>
                      {' '}
                      <a
                        href={point.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#8B5A3C',
                          textDecoration: 'underline',
                          fontSize: '0.9rem'
                        }}
                      >
                        {point.source.title}
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* Global Sources */}
        {globalSources.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #D4A574'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#2D2D2D',
              marginBottom: '0.75rem'
            }}>
              Sources:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {globalSources.map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#8B5A3C',
                    textDecoration: 'underline',
                    fontSize: '0.9rem'
                  }}
                >
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback if no structured data */}
        {!data.summary && (!data.points || data.points.length === 0) && globalSources.length === 0 && (
          <div style={{
            color: '#6B7280',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '1rem'
          }}>
            Research data structure not recognized
          </div>
        )}
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

  const runChain = useCallback(async () => {
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
        body: JSON.stringify({ company, role, highlights }),
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
              // Extract primary email when research is available
              if (evt.data.research) {
                const email = extractPrimaryEmail(evt.data.research, contact);
                if (email) setPrimaryEmail(email);
              }
            }
            if (evt.type === "final") {
              setResult(evt.data);
              setLinkedin(evt.data.outputs.linkedin);
              setEmail(evt.data.outputs.email);
              setEditableEmail(evt.data.outputs.email);
              setEditableLinkedin(evt.data.outputs.linkedin);
              setVerifiedPoints(evt.data.verified_points || []);
              setContact(evt.data.contact || null);
              
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
  }, [company, role, highlights, contact]);

  const regenerateEmail = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          company, 
          role, 
          highlights,
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
  }, [company, role, highlights, editableEmail]);

  const regenerateLinkedin = useCallback(async () => {
    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, highlights }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setLinkedin(data.linkedin);
      setEditableLinkedin(data.linkedin);
    } catch (e: any) {
      setError(e?.message || "Failed to regenerate");
    }
  }, [company, role, highlights]);

  // Theme colors
  const theme = {
    primary: '#8B5A3C',
    secondary: '#D4A574', 
    accent: '#F4E4BC',
    neutral: '#F8F6F0',
    text: '#2D2D2D',
    textLight: '#6B7280',
    border: '#E5E7EB',
    white: '#FFFFFF'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #faf9f7 0%, #f3f1ed 100%)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem', borderBottom: `1px solid ${theme.border}` }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: theme.text }}>
          Outreach.ai
        </h1>
        <p style={{ fontSize: '1.1rem', color: theme.textLight, maxWidth: '600px', margin: '0 auto' }}>
          AI-powered company research and personalized outreach automation
        </p>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 140px)' }}>
        {/* Left Sidebar - Fixed */}
        <div style={{
          width: '400px',
          minWidth: '400px',
          background: theme.white,
          borderRight: `1px solid ${theme.border}`,
          padding: '2rem',
          position: 'sticky',
          top: '0',
          height: 'fit-content',
          maxHeight: '100vh',
          overflowY: 'auto'
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${theme.neutral} 0%, ${theme.accent} 100%)`,
            borderRadius: '1rem',
            padding: '2rem',
            border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: theme.text, marginBottom: '1.5rem' }}>
              Job Application Details
            </h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (canRun && !loading) void runChain(); 
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.5rem' }}>
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name or URL"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    background: theme.white,
                    color: theme.text,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.primary}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.5rem' }}>
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Target role"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    background: theme.white,
                    color: theme.text,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.primary}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: theme.text, marginBottom: '0.5rem' }}>
                  Key Highlights
                </label>
                <input
                  type="text"
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="Your key skills and experience"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${theme.border}`,
                    borderRadius: '0.5rem',
                    background: theme.white,
                    color: theme.text,
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.primary}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !canRun}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: loading || !canRun ? '#9CA3AF' : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                  color: theme.white,
                  fontWeight: '600',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: loading || !canRun ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {loading && (
                  <svg style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"></circle>
                    <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading 
                  ? (status.messaging ? "Drafting Messages…" : status.verify ? "Verifying Research…" : status.research ? "Researching Company…" : "Starting Agents…")
                  : "🚀 Run AI Agents"
                }
              </button>
            </form>
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, padding: '2rem', maxWidth: 'calc(100vw - 400px)', overflowX: 'hidden' }}>

          {/* Status Indicator */}
          {(loading || Object.keys(status).length > 0) && (
            <div style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.neutral} 100%)`,
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: `1px solid ${theme.border}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    background: status.research === 'completed' ? theme.primary : status.research ? theme.secondary : '#D1D5DB'
                  }} />
                  <span style={{ color: theme.text }}>Research: <strong>{status.research || "pending"}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    background: status.verify === 'completed' ? theme.primary : status.verify ? theme.secondary : '#D1D5DB'
                  }} />
                  <span style={{ color: theme.text }}>Verify: <strong>{status.verify || "pending"}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '0.75rem',
                    height: '0.75rem',
                    borderRadius: '50%',
                    background: status.messaging === 'completed' ? theme.primary : status.messaging ? theme.secondary : '#D1D5DB'
                  }} />
                  <span style={{ color: theme.text }}>Messaging: <strong>{status.messaging || "pending"}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Primary Contact Email - High Visibility */}
          {primaryEmail && (
            <div style={{
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '2px solid #F59E0B',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              <div style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#92400E',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📧 Primary Contact Email
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: '1px solid #FCD34D'
              }}>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#78350F',
                  flex: 1
                }}>
                  {primaryEmail}
                </div>
                <button
                  onClick={() => copyToClipboard(primaryEmail)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    color: '#92400E',
                    border: '1px solid #F59E0B',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)',
              border: '1px solid #F87171',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(248, 113, 113, 0.2)',
              animation: 'fadeInUp 0.5s ease-out'
            }}>
              <div style={{ color: '#991B1B', fontWeight: '600' }}>
                <strong>⚠️ Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Results - Sequential Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* 1. Research Card - Shows First */}
            {(intermediate.research || verifiedPoints.length > 0 || contact) && (
              <div style={{
                background: `linear-gradient(135deg, ${theme.neutral} 0%, ${theme.white} 100%)`,
                borderRadius: '1rem',
                padding: '2rem',
                border: `1px solid ${theme.border}`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                animation: 'fadeInUp 0.5s ease-out'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: theme.primary }} />
                  Research Results
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {contact && (
                    <div style={{ 
                      background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.neutral} 100%)`, 
                      border: `1px solid ${theme.secondary}`, 
                      borderRadius: '0.75rem', 
                      padding: '1.5rem'
                    }}>
                      <div style={{ fontWeight: '700', color: theme.primary, marginBottom: '0.5rem' }}>
                        ✓ Key Contact Identified
                      </div>
                      <div style={{ color: theme.text, lineHeight: '1.5' }}>
                        <strong>{contact.name}</strong> — {contact.title}
                        {contact.email && (
                          <><br /><a href={`mailto:${contact.email}`} style={{ color: theme.primary, textDecoration: 'underline' }}>{contact.email}</a></>
                        )}
                        {contact.source?.url && (
                          <><br /><a href={contact.source.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.primary, textDecoration: 'underline' }}>View Profile</a></>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {intermediate.research && (
                    <div>
                      <h4 style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '600', 
                        color: theme.primary, 
                        marginBottom: '1rem', 
                        paddingBottom: '0.5rem', 
                        borderBottom: `2px solid ${theme.secondary}` 
                      }}>
                        Company Research Findings
                      </h4>
                      <div style={{ marginBottom: '1rem' }}>
                        {renderResearchContent(intermediate.research)}
                      </div>
                    </div>
                  )}
                  
                  {verifiedPoints.length > 0 && (
                    <div>
                      <h4 style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '600', 
                        color: theme.primary, 
                        marginBottom: '1rem', 
                        paddingBottom: '0.5rem', 
                        borderBottom: `2px solid ${theme.secondary}` 
                      }}>
                        Key Insights & Sources
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {verifiedPoints.map((point, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.neutral} 100%)`,
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            marginBottom: '0.75rem',
                            borderLeft: `4px solid ${theme.primary}`,
                            animation: `fadeInUp 0.5s ease-out ${idx * 0.1}s both`
                          }}>
                            <div style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              borderRadius: '50%',
                              background: theme.primary,
                              marginTop: '0.5rem',
                              flexShrink: 0
                            }} />
                            <div style={{ color: theme.text, lineHeight: '1.6', fontSize: '0.95rem' }}>
                              <strong>{point.claim}</strong>
                              {point.source?.url && (
                                <>
                                  <br />
                                  <a 
                                    href={point.source.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.875rem', color: theme.primary, textDecoration: 'underline' }}
                                  >
                                    📖 {point.source.title || "View Reference"}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!intermediate.research && !verifiedPoints.length && !contact && (
                    <div style={{ 
                      fontStyle: 'italic', 
                      textAlign: 'center', 
                      padding: '2rem', 
                      background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.neutral} 100%)`, 
                      borderRadius: '0.5rem', 
                      color: theme.textLight 
                    }}>
                      {loading ? "🔍 Researching company and role..." : "Research results will appear here..."}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Cold Email Card - Shows Second */}
            {(email || (loading && status.messaging)) && (
              <div style={{
                background: `linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)`,
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #7DD3FC',
                boxShadow: '0 4px 12px rgba(125, 211, 252, 0.2)',
                animation: 'fadeInUp 0.5s ease-out 0.2s both'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#0C4A6E',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: '#0EA5E9' }} />
                  Cold Email
                </h3>
                
                {email ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                      <button
                        onClick={regenerateEmail}
                        disabled={loading || !canRun}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #FEF7ED 0%, #FED7AA 100%)',
                          color: '#C2410C',
                          border: '1px solid #FDBA74',
                          borderRadius: '0.5rem',
                          cursor: loading || !canRun ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          opacity: loading || !canRun ? 0.5 : 1
                        }}
                      >
                        🤖 Regenerate with AI
                      </button>
                    </div>
                    
                    <textarea
                      value={editableEmail}
                      onChange={(e) => setEditableEmail(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '1.5rem',
                        border: '2px solid #7DD3FC',
                        borderRadius: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        color: '#0C4A6E',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Your personalized cold email will appear here..."
                      aria-label="Editable cold email content"
                    />
                  </div>
                ) : (
                  <div style={{ 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid #7DD3FC'
                  }}>
                    <div style={{ fontStyle: 'italic', textAlign: 'center', color: '#0C4A6E' }}>
                      ✍️ Generating personalized email...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. LinkedIn Message Card - Shows Third */}
            {(linkedin || (loading && status.messaging && email)) && (
              <div style={{
                background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #C4B5FD',
                boxShadow: '0 4px 12px rgba(196, 181, 253, 0.2)',
                animation: 'fadeInUp 0.5s ease-out 0.4s both'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#5B21B6',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: '#8B5CF6' }} />
                  LinkedIn Message
                </h3>
                
                {linkedin ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <button
                        onClick={regenerateLinkedin}
                        disabled={loading || !canRun}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #FEF7ED 0%, #FED7AA 100%)',
                          color: '#C2410C',
                          border: '1px solid #FDBA74',
                          borderRadius: '0.5rem',
                          cursor: loading || !canRun ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          opacity: loading || !canRun ? 0.5 : 1
                        }}
                      >
                        🔄 Regenerate
                      </button>
                      <button
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
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #FEF7ED 0%, #FED7AA 100%)',
                          color: '#C2410C',
                          border: '1px solid #FDBA74',
                          borderRadius: '0.5rem',
                          cursor: loading || !linkedin ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          opacity: loading || !linkedin ? 0.5 : 1
                        }}
                      >
                        ✂️ Rephrase to 22 words
                      </button>
                    </div>
                    
                    <textarea
                      value={editableLinkedin}
                      onChange={(e) => setEditableLinkedin(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '150px',
                        padding: '1.5rem',
                        border: '2px solid #C4B5FD',
                        borderRadius: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        color: '#5B21B6',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        resize: 'vertical',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                      placeholder="Your LinkedIn message will appear here..."
                      aria-label="Editable LinkedIn message content"
                    />
                  </div>
                ) : (
                  <div style={{ 
                    padding: '1.5rem', 
                    borderRadius: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid #C4B5FD'
                  }}>
                    <div style={{ fontStyle: 'italic', textAlign: 'center', color: '#5B21B6' }}>
                      💼 Generating LinkedIn message...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .layout-container {
            flex-direction: column !important;
          }
          .sidebar {
            width: 100% !important;
            min-width: 100% !important;
            position: relative !important;
            max-height: none !important;
          }
          .content-area {
            max-width: 100% !important;
            padding: 1rem !important;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}