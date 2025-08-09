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
          <div className="research-card">
            {summaryMatch && (
              <div className="font-bold text-lg mb-6 text-slate-800 relative z-10">
                {summaryMatch}
              </div>
            )}
            
            {claimsMatches.length > 0 && (
              <ul className="list-none p-0 m-0 relative z-10">
                {claimsMatches.map((match, idx) => (
                  <li key={idx} className="flex items-start gap-3 mb-4">
                    <div className="insight-bullet-modern mt-2" />
                    <span className="text-slate-800">{match[1]}</span>
                  </li>
                ))}
              </ul>
            )}
            
            {!summaryMatch && claimsMatches.length === 0 && (
              <div className="text-slate-500 italic relative z-10">
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
      <div className="research-card">
        {/* Summary */}
        {data.summary && (
          <div className="font-bold text-lg mb-6 text-slate-800 relative z-10">
            {data.summary}
          </div>
        )}
        
        {/* Points */}
        {data.points && Array.isArray(data.points) && (
          <ul className="list-none p-0 m-0 relative z-10">
            {data.points.map((point: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3 mb-4 animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="insight-bullet-modern mt-2" />
                <div className="flex-1">
                  <span className="text-slate-800">{point.claim}</span>
                  {point.source && (
                    <>
                      {' '}
                      <a
                        href={point.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-modern text-sm"
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
          <div className="mt-6 pt-4 border-t border-slate-200/50 relative z-10">
            <div className="font-semibold text-slate-800 mb-3">
              Sources:
            </div>
            <div className="flex flex-wrap gap-4">
              {globalSources.map((source: any, idx: number) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-modern text-sm"
                >
                  {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback if no structured data */}
        {!data.summary && (!data.points || data.points.length === 0) && globalSources.length === 0 && (
          <div className="text-slate-500 italic text-center p-4 relative z-10">
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
    primary: '#3B82F6',
    secondary: '#93C5FD', 
    accent: '#DBEAFE',
    neutral: '#F0F9FF',
    text: '#1E293B',
    textLight: '#64748B',
    border: '#93C5FD',
    white: '#FFFFFF'
  };

  return (
    <div className="min-h-screen gradient-blue">
      {/* Header */}
      <div className="text-center py-12 px-6 border-b border-white/30">
        <h1 className="text-5xl font-bold mb-4 text-gradient animate-fade-in">
          Outreach.ai
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
          AI-powered company research and personalized outreach automation
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex min-h-[calc(100vh-200px)] max-lg:flex-col">
        {/* Left Sidebar */}
        <div className="w-96 min-w-96 max-lg:w-full max-lg:min-w-full glass-morphism border-r border-white/30 p-8 sticky top-0 h-fit max-h-screen overflow-y-auto animate-slide-in">
          <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 p-8 shadow-soft gradient-blue-light animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-gradient">
              Job Application Details
            </h2>
            
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (canRun && !loading) void runChain(); 
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name or URL"
                  className="w-full rounded-xl border-2 border-slate-200/60 bg-white/80 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all duration-300 ease-out backdrop-blur-sm focus:border-slate-400/80 focus:bg-white focus:shadow-soft focus:outline-none hover:border-slate-300/80 hover:bg-white/90"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Target role"
                  className="w-full rounded-xl border-2 border-slate-200/60 bg-white/80 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all duration-300 ease-out backdrop-blur-sm focus:border-slate-400/80 focus:bg-white focus:shadow-soft focus:outline-none hover:border-slate-300/80 hover:bg-white/90"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Key Highlights
                </label>
                <input
                  type="text"
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="Your key skills and experience"
                  className="w-full rounded-xl border-2 border-slate-200/60 bg-white/80 px-4 py-3 text-slate-800 placeholder-slate-400 transition-all duration-300 ease-out backdrop-blur-sm focus:border-slate-400/80 focus:bg-white focus:shadow-soft focus:outline-none hover:border-slate-300/80 hover:bg-white/90"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !canRun}
                className="relative overflow-hidden rounded-xl px-6 py-3 font-medium transition-all duration-300 ease-out w-full bg-blue-600 text-white font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-white"
              >
                {loading && (
                  <svg className="w-5 h-5 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
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
        <div className="flex-1 p-8 max-lg:p-6 max-w-[calc(100vw-400px)] max-lg:max-w-full overflow-x-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>

          {/* Status Indicator */}
          {(loading || Object.keys(status).length > 0) && (
            <div className="card-modern gradient-cream-light mb-8 animate-fade-in-up">
              <div className="flex flex-wrap items-center gap-8 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`status-indicator ${
                    status.research === 'completed' ? 'completed' : status.research ? 'active' : 'pending'
                  }`} />
                  <span className="text-slate-800 font-medium">Research: <strong>{status.research || "pending"}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`status-indicator ${
                    status.verify === 'completed' ? 'completed' : status.verify ? 'active' : 'pending'
                  }`} />
                  <span className="text-slate-800 font-medium">Verify: <strong>{status.verify || "pending"}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`status-indicator ${
                    status.messaging === 'completed' ? 'completed' : status.messaging ? 'active' : 'pending'
                  }`} />
                  <span className="text-slate-800 font-medium">Messaging: <strong>{status.messaging || "pending"}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Primary Contact Email - High Visibility */}
          {primaryEmail && (
            <div className="contact-highlight mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10">
                📧 Primary Contact Email
              </div>
              <div className="flex items-center gap-4 glass-morphism p-4 rounded-xl relative z-10">
                <div className="text-lg font-semibold text-slate-700 flex-1">
                  {primaryEmail}
                </div>
                <button
                  onClick={() => copyToClipboard(primaryEmail)}
                  className="button-modern px-4 py-2 bg-white/80 hover:bg-white text-slate-700 border border-slate-200 text-xs font-medium"
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="card-modern mb-8 border-red-200 animate-fade-in-up" style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)' }}>
              <div className="text-red-800 font-semibold">
                <strong>⚠️ Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Results - Sequential Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* 1. Research Card - Shows First */}
            {(intermediate.research || verifiedPoints.length > 0 || contact) && (
              <div style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #DBEAFE 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #93C5FD',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
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
                background: 'linear-gradient(135deg, #F0F9FF 0%, #DBEAFE 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #93C5FD',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                animation: 'fadeInUp 0.5s ease-out 0.2s both'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1E40AF',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: '#3B82F6' }} />
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
                        border: '2px solid #93C5FD',
                        borderRadius: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        color: '#1E40AF',
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
                    border: '1px solid #93C5FD'
                  }}>
                    <div style={{ fontStyle: 'italic', textAlign: 'center', color: '#1E40AF' }}>
                      ✍️ Generating personalized email...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. LinkedIn Message Card - Shows Third */}
            {(linkedin || (loading && status.messaging && email)) && (
              <div style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #DBEAFE 100%)',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid #93C5FD',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                animation: 'fadeInUp 0.5s ease-out 0.4s both'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1E40AF',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', background: '#3B82F6' }} />
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