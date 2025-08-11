"use client";

import { useState, useEffect } from "react";
import { Search, Mail, MessageSquare, Pin, PinOff, Menu, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { cn } from "../../lib/utils";

interface CollapsibleNavProps {
  onSearch: (data: { company: string; role: string; highlights: string }) => void;
  isLoading: boolean;
  canRun?: boolean;
}

interface EmailHistory {
  id: string;
  company_name: string;
  subject_line: string;
  created_at: string;
  email_content: string;
}

interface LinkedInHistory {
  id: string;
  company_name: string;
  created_at: string;
  message_content: string;
}

export function CollapsibleNav({ onSearch, isLoading }: CollapsibleNavProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activePanel, setActivePanel] = useState<"search" | "email" | "linkedin" | null>("search");
  
  // Form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [highlights, setHighlights] = useState("");
  
  // History state
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [linkedinHistory, setLinkedinHistory] = useState<LinkedInHistory[]>([]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsPinned(false);
      setIsExpanded(false);
    }
  }, [isMobile]);

  const fetchEmailHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/history/emails", {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch email history:", error);
    }
  };

  const fetchLinkedInHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/history/linkedin", {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedinHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch LinkedIn history:", error);
    }
  };

  const canRun = company && role && highlights;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canRun && !isLoading) {
      onSearch({ company, role, highlights });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpanded = () => {
    if (isMobile) {
      setIsExpanded(!isExpanded);
    } else if (!isPinned) {
      setIsExpanded(!isExpanded);
    }
  };

  const handlePanelClick = (panel: "search" | "email" | "linkedin") => {
    if (activePanel === panel) {
      setActivePanel(null);
      if (!isPinned && !isMobile) setIsExpanded(false);
    } else {
      setActivePanel(panel);
      if (!isExpanded) setIsExpanded(true);
      
      // Fetch data when opening panels
      if (panel === "email") fetchEmailHistory();
      if (panel === "linkedin") fetchLinkedInHistory();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Navigation */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-white/95 backdrop-blur-md border-r border-slate-200/50 shadow-xl transition-all duration-300 z-50",
          isExpanded ? "w-80" : "w-16",
          isMobile && !isExpanded && "-translate-x-full"
        )}
        onMouseEnter={() => !isPinned && !isMobile && setIsExpanded(true)}
        onMouseLeave={() => !isPinned && !isMobile && activePanel === null && setIsExpanded(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/50">
          {isExpanded ? (
            <>
              <h2 className="font-semibold text-slate-800">Navigation</h2>
              <div className="flex items-center gap-2">
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPinned(!isPinned)}
                    className="h-8 w-8 p-0"
                  >
                    {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="h-8 w-8 p-0 mx-auto"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="p-2">
          {/* Search Button */}
          <Button
            variant={activePanel === "search" ? "default" : "ghost"}
            className={cn(
              "w-full justify-start mb-2",
              !isExpanded && "justify-center px-0"
            )}
            onClick={() => handlePanelClick("search")}
          >
            <Search className="h-4 w-4" />
            {isExpanded && <span className="ml-2">Search</span>}
          </Button>

          {/* Email History Button */}
          <Button
            variant={activePanel === "email" ? "default" : "ghost"}
            className={cn(
              "w-full justify-start mb-2",
              !isExpanded && "justify-center px-0"
            )}
            onClick={() => handlePanelClick("email")}
          >
            <Mail className="h-4 w-4" />
            {isExpanded && <span className="ml-2">Email History</span>}
          </Button>

          {/* LinkedIn History Button */}
          <Button
            variant={activePanel === "linkedin" ? "default" : "ghost"}
            className={cn(
              "w-full justify-start mb-2",
              !isExpanded && "justify-center px-0"
            )}
            onClick={() => handlePanelClick("linkedin")}
          >
            <MessageSquare className="h-4 w-4" />
            {isExpanded && <span className="ml-2">LinkedIn History</span>}
          </Button>
        </div>

        {/* Panel Content */}
        {isExpanded && activePanel && (
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Search Panel */}
            {activePanel === "search" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Company Research</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Company Name
                      </label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company name or URL"
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Role
                      </label>
                      <Input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Target role"
                        className="text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Key Highlights
                      </label>
                      <Textarea
                        value={highlights}
                        onChange={(e) => setHighlights(e.target.value)}
                        placeholder="Your key skills and experience"
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isLoading || !canRun}
                      className="w-full text-sm"
                    >
                      {isLoading ? "Running..." : "Run AI Agents"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Email History Panel */}
            {activePanel === "email" && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-slate-800 mb-3">Cold Email History</h3>
                {emailHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No emails generated yet</p>
                ) : (
                  <Accordion type="single">
                    {emailHistory.map((email) => (
                      <AccordionItem key={email.id} value={email.id}>
                        <AccordionTrigger value={email.id} className="text-left">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs truncate">{email.subject_line}</div>
                            <div className="text-xs text-slate-500">{email.company_name}</div>
                            <div className="text-xs text-slate-400">{formatDate(email.created_at)}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent value={email.id}>
                          <div className="text-xs text-slate-600 whitespace-pre-wrap p-2 bg-slate-50 rounded">
                            {email.email_content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            )}

            {/* LinkedIn History Panel */}
            {activePanel === "linkedin" && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-slate-800 mb-3">LinkedIn Message History</h3>
                {linkedinHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No messages generated yet</p>
                ) : (
                  <Accordion type="single">
                    {linkedinHistory.map((message) => (
                      <AccordionItem key={message.id} value={message.id}>
                        <AccordionTrigger value={message.id} className="text-left">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs">{message.company_name}</div>
                            <div className="text-xs text-slate-400">{formatDate(message.created_at)}</div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent value={message.id}>
                          <div className="text-xs text-slate-600 whitespace-pre-wrap p-2 bg-slate-50 rounded">
                            {message.message_content}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}