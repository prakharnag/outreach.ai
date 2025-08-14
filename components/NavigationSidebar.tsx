"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import { 
  Search, 
  Mail, 
  MessageSquare, 
  Pin, 
  PinOff, 
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react"
import { cn } from "../lib/utils"


type EmailHistory = {
  id: string
  user_id: string
  company_name: string
  role: string
  subject_line: string
  content: string
  created_at: string
}

type LinkedinHistory = {
  id: string
  user_id: string
  company_name: string
  role: string
  content: string
  created_at: string
}

interface NavigationSidebarProps {
  onRunAgents: (data: { company: string; role: string; highlights: string }) => void
  onSidebarChange?: (isCollapsed: boolean) => void
  className?: string
}

export default function NavigationSidebar({ onRunAgents, onSidebarChange, className }: NavigationSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPinned, setIsPinned] = useState(true)
  const [activePanel, setActivePanel] = useState<'search' | 'email' | 'linkedin' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Form state
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [highlights, setHighlights] = useState("")
  const [loading, setLoading] = useState(false)
  
  // History state
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([])
  const [linkedinHistory, setLinkedinHistory] = useState<LinkedinHistory[]>([])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
        setIsPinned(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const loadEmailHistory = async () => {
    try {
      const res = await fetch('/api/history/emails')
      if (res.ok) {
        const history = await res.json()
        setEmailHistory(history)
      }
    } catch (error) {
      console.error('Failed to load email history:', error)
    }
  }

  const loadLinkedInHistory = async () => {
    try {
      const res = await fetch('/api/history/linkedin')
      if (res.ok) {
        const history = await res.json()
        setLinkedinHistory(history)
      }
    } catch (error) {
      console.error('Failed to load LinkedIn history:', error)
    }
  }

  const handlePanelToggle = (panel: 'search' | 'email' | 'linkedin') => {
    if (activePanel === panel) {
      setActivePanel(null)
      if (!isPinned) {
        setIsCollapsed(true)
        onSidebarChange?.(true)
      }
    } else {
      setActivePanel(panel)
      setIsCollapsed(false)
      onSidebarChange?.(false)
      
      // Load data when opening panels
      if (panel === 'email') loadEmailHistory()
      if (panel === 'linkedin') loadLinkedInHistory()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !role || !highlights) return
    
    setLoading(true)
    try {
      await onRunAgents({ company, role, highlights })
      setCompany("")
      setRole("")
      setHighlights("")
      setActivePanel(null)
      if (!isPinned && !isMobile) setIsCollapsed(true)
    } catch (error) {
      console.error('Failed to run agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-80'
  const sidebarClass = cn(
    "fixed left-0 top-0 h-full bg-white/95 backdrop-blur-sm border-r border-blue-200 transition-all duration-300 z-50",
    sidebarWidth,
    isMobile && isCollapsed && "translate-x-[-100%]",
    className
  )

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={sidebarClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-200">
          {!isCollapsed && (
            <h2 className="font-semibold text-blue-900">Navigation</h2>
          )}
          
          <div className="flex items-center gap-2">
            {!isCollapsed && !isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPinned(!isPinned)}
                className="text-blue-600 hover:text-blue-700"
              >
                {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-blue-600 hover:text-blue-700"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          <Button
            variant={activePanel === 'search' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              isCollapsed ? "px-3" : "px-4"
            )}
            onClick={() => handlePanelToggle('search')}
          >
            <Search className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Search</span>}
          </Button>

          <Button
            variant={activePanel === 'email' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              isCollapsed ? "px-3" : "px-4"
            )}
            onClick={() => handlePanelToggle('email')}
          >
            <Mail className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Email History</span>}
          </Button>

          <Button
            variant={activePanel === 'linkedin' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              isCollapsed ? "px-3" : "px-4"
            )}
            onClick={() => handlePanelToggle('linkedin')}
          >
            <MessageSquare className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">LinkedIn History</span>}
          </Button>
        </div>

        {/* Panel Content */}
        {!isCollapsed && activePanel && (
          <div className="flex-1 p-4 overflow-y-auto">
            {activePanel === 'search' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Company Research</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Company Name</label>
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Role</label>
                      <Input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Target role"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Key Highlights</label>
                      <Textarea
                        value={highlights}
                        onChange={(e) => setHighlights(e.target.value)}
                        placeholder="Your key skills and experience"
                        rows={3}
                        required
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loading || !company || !role || !highlights}
                    >
                      {loading ? "Running Agents..." : "Run AI Agents"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activePanel === 'email' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-900">Email History</h3>
                {emailHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No emails generated yet</p>
                ) : (
                  <Accordion type="single">
                    {emailHistory.map((email) => (
                      <AccordionItem key={email.id} value={email.id}>
                        <AccordionTrigger value={email.id} className="text-left">
                          <div>
                            <div className="font-medium">{email.company_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(email.created_at)}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent value={email.id}>
                          <div className="space-y-2 text-sm">
                            <div><strong>Subject:</strong> {email.subject_line}</div>
                            <div><strong>Role:</strong> {email.role}</div>
                            <div className="bg-blue-50 p-3 rounded text-xs">
                              {email.content}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            )}

            {activePanel === 'linkedin' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-900">LinkedIn History</h3>
                {linkedinHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No LinkedIn messages generated yet</p>
                ) : (
                  <Accordion type="single">
                    {linkedinHistory.map((message) => (
                      <AccordionItem key={message.id} value={message.id}>
                        <AccordionTrigger value={message.id} className="text-left">
                          <div>
                            <div className="font-medium">{message.company_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent value={message.id}>
                          <div className="space-y-2 text-sm">
                            <div><strong>Role:</strong> {message.role}</div>
                            <div className="bg-purple-50 p-3 rounded text-xs">
                              {message.content}
                            </div>
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
  )
}