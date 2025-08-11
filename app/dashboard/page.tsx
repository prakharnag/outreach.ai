"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SourceLink } from "../../components/ui/source-link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Textarea } from "../../components/ui/textarea";
import { Copy, Mail, MessageSquare, RefreshCw, Scissors, Search, User, LogOut } from "lucide-react";
import { signOut } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import NavigationSidebar from "../../components/NavigationSidebar";
import { saveEmailHistory, saveLinkedInHistory } from "../../lib/history";

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
  const router = useRouter();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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
        const sourceMatches = [...content.matchAll(/"source"\s*:\s*{[^}]*"url"\s*:\s*"([^"]*)"/g)];
        const titleMatches = [...content.matchAll(/"source"\s*:\s*{[^}]*"title"\s*:\s*"([^"]*)"/g)];
        
        return (
          <div className="research-card">
            {summaryMatch && (
              <div className="font-bold text-lg mb-6 text-slate-800 relative z-10">
                {summaryMatch}
              </div>
            )}
            
            {claimsMatches.length > 0 && (
              <ul className="list-none p-0 m-0 relative z-10">
                {claimsMatches.map((match, idx) => {
                  const sourceUrl = sourceMatches[idx]?.[1];
                  const sourceTitle = titleMatches[idx]?.[1];
                  return (
                    <li key={idx} className="flex items-start gap-3 mb-4">
                      <div className="insight-bullet-modern mt-2" />
                      <div className="flex-1">
                        <span className="text-slate-800">{match[1]}</span>
                        {sourceUrl && (
                          <SourceLink 
                            url={sourceUrl} 
                            title={sourceTitle}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
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
                  {point.source?.url && (
                    <SourceLink 
                      url={point.source.url} 
                      title={point.source.title}
                    />
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
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-sm text-slate-700">{source.title}</span>
                  <SourceLink url={source.url} title={source.title} />
                </div>
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

              // Save to history
              try {
                if (evt.data.outputs.email) {
                  await saveEmailHistory({
                    company_name: company,
                    role: role,
                    subject_line: `Outreach to ${company}`,
                    content: evt.data.outputs.email
                  });
                }
                if (evt.data.outputs.linkedin) {
                  await saveLinkedInHistory({
                    company_name: company,
                    role: role,
                    content: evt.data.outputs.linkedin
                  });
                }
              } catch (historyError) {
                console.error('Failed to save history:', historyError);
              }
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

  const handleRunAgents = async (data: { company: string; role: string; highlights: string }) => {
    setCompany(data.company);
    setRole(data.role);
    setHighlights(data.highlights);
    
    // Run chain with the new data immediately
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
        body: JSON.stringify({ 
          company: data.company, 
          role: data.role, 
          highlights: data.highlights 
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
              
              const email = extractPrimaryEmail(evt.data.research, evt.data.contact);
              if (email) setPrimaryEmail(email);

              // Save to history
              try {
                if (evt.data.outputs.email) {
                  await saveEmailHistory({
                    company_name: data.company,
                    role: data.role,
                    subject_line: `Outreach to ${data.company}`,
                    content: evt.data.outputs.email
                  });
                }
                if (evt.data.outputs.linkedin) {
                  await saveLinkedInHistory({
                    company_name: data.company,
                    role: data.role,
                    content: evt.data.outputs.linkedin
                  });
                }
              } catch (historyError) {
                console.error('Failed to save history:', historyError);
              }
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
  };

  return (
    <div className="min-h-screen gradient-blue">
      {/* Navigation Sidebar */}
      <NavigationSidebar 
        onRunAgents={handleRunAgents} 
        onSidebarChange={setSidebarCollapsed}
      />
      
      {/* Main Content */}
      <div 
        className="transition-all duration-300" 
        style={{ marginLeft: sidebarCollapsed ? '4rem' : '20rem' }}
      >
        {/* Header */}
        <div className="text-center py-12 px-6 border-b border-white/30 relative">
          <Button
            onClick={async () => {
              try {
                await signOut();
                window.location.href = '/?auth=true';
              } catch (error) {
                console.error('Logout failed:', error);
                window.location.href = '/?auth=true';
              }
            }}
            variant="outline"
            size="sm"
            className="absolute top-6 right-6 bg-white/80 hover:bg-white text-slate-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <h1 className="text-5xl font-bold mb-4 text-gradient animate-fade-in">
            Outreach.ai
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            AI-powered company research and personalized outreach automation
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="p-8 max-lg:p-6">
          {/* Status Indicator */}
          {(loading || Object.keys(status).length > 0) && (
            <Card className="mb-8 shadow-lg bg-gradient-to-br from-blue-50/30 to-purple-50/30">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant={status.research === 'completed' ? 'default' : status.research ? 'secondary' : 'outline'}>
                    Research: {status.research || "pending"}
                  </Badge>
                  <Badge variant={status.verify === 'completed' ? 'default' : status.verify ? 'secondary' : 'outline'}>
                    Verify: {status.verify || "pending"}
                  </Badge>
                  <Badge variant={status.messaging === 'completed' ? 'default' : status.messaging ? 'secondary' : 'outline'}>
                    Messaging: {status.messaging || "pending"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Prospect */}
          {(contact || primaryEmail) && (
            <Card className="mb-8 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
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
            <Alert variant="destructive" className="mb-8">
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Results - Sequential Display */}
          <div className="space-y-6">
            
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
                        Key Insights & Sources
                      </h4>
                      <div className="space-y-3">
                        {verifiedPoints.map((point, idx) => (
                          <div key={idx} className="bg-muted p-4 rounded-lg border-l-4 border-primary">
                            <div className="flex items-start gap-2">
                              <span className="font-medium">{point.claim}</span>
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
        </div>
      </div>
    </div>
  );
}