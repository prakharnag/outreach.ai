"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, MessageSquare, Copy, ExternalLink, Calendar } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { cn } from "../../lib/utils";

interface HistoryItem {
  id: string;
  company_name: string;
  role?: string;
  subject_line?: string; // For emails
  content: string;
  created_at: string;
  type: 'email' | 'linkedin';
}

interface ExpandableHistoryProps {
  items: HistoryItem[];
  type: 'email' | 'linkedin';
  loading?: boolean;
  emptyMessage?: string;
}

export function ExpandableHistory({ items, type, loading, emptyMessage }: ExpandableHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIcon = () => {
    return type === 'email' ? 
      <Mail className="h-4 w-4 text-blue-600" /> : 
      <MessageSquare className="h-4 w-4 text-purple-600" />;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-16 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        {getIcon()}
        <div className="mt-4">
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {emptyMessage || `No ${type} history yet`}
          </h3>
          <p className="text-slate-500">
            {type === 'email' 
              ? 'Generated emails will appear here after you complete research'
              : 'Generated LinkedIn messages will appear here after you complete research'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        
        return (
          <Card key={item.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-0">
              {/* Header - Always Visible */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpanded(item.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getIcon()}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {type === 'email' && item.subject_line ? item.subject_line : `${type === 'email' ? 'Email' : 'LinkedIn message'} to ${item.company_name}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{item.company_name}</span>
                      {item.role && (
                        <>
                          <span>•</span>
                          <span>{item.role}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.content);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="mt-4 space-y-4">
                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(item.created_at)}</span>
                      </div>
                      {item.role && (
                        <div>
                          <span className="font-medium">Role:</span> {item.role}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {type === 'email' ? 'Email Content' : 'LinkedIn Message'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(item.content)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {item.content}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(item.content)}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy {type === 'email' ? 'Email' : 'Message'}
                      </Button>
                      
                      {type === 'email' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const subject = item.subject_line || `Outreach to ${item.company_name}`;
                            const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(item.content)}`;
                            window.open(mailtoUrl);
                          }}
                          className="text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open in Email Client
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}