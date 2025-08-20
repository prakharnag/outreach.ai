"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Mail, MessageSquare, Copy, ExternalLink, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import { ToneSelector } from "./tone-selector";
import { WritingTone, getDefaultTone } from "../../lib/tones";
import { cn } from "../../lib/utils";
import { useToast } from "./toast";

interface HistoryItem {
  id: string;
  company_name: string;
  role?: string;
  subject_line?: string; // For emails
  content: string;
  created_at: string;
  type: 'email' | 'linkedin';
  total_count?: number; // Number of messages/emails for this company
  all_emails?: HistoryItem[]; // All emails for this company
  all_messages?: HistoryItem[]; // All LinkedIn messages for this company
}

interface ExpandableHistoryProps {
  items: HistoryItem[];
  type: 'email' | 'linkedin';
  loading?: boolean;
  emptyMessage?: string;
  onItemDeleted?: (id: string) => void;
}

export function ExpandableHistory({ items, type, loading, emptyMessage, onItemDeleted }: ExpandableHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedTone, setSelectedTone] = useState<WritingTone>(getDefaultTone());
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

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

  const deleteItem = async (item: HistoryItem) => {
    const newDeleting = new Set(deleting);
    newDeleting.add(item.id);
    setDeleting(newDeleting);

    try {
      const endpoint = type === 'email' 
        ? `/api/history/emails/delete?id=${item.id}`
        : `/api/history/linkedin/delete?id=${item.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      const result = await res.json();
      if (result.success) {
        onItemDeleted?.(item.id);
        showToast({
          type: "success",
          message: `${type === 'email' ? 'Email' : 'LinkedIn message'} deleted successfully`
        });
      }
      
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast({
        type: "error",
        message: `Failed to delete ${type === 'email' ? 'email' : 'LinkedIn message'}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      const newDeleting = new Set(deleting);
      newDeleting.delete(item.id);
      setDeleting(newDeleting);
    }
  };

  const deleteGroup = async (item: HistoryItem) => {
    const allItems = type === 'email' ? item.all_emails : item.all_messages;
    if (!allItems || allItems.length === 0) {
      deleteItem(item);
      return;
    }

    const confirmMessage = `Are you sure you want to delete all ${allItems.length} ${type === 'email' ? 'emails' : 'LinkedIn messages'} for ${item.company_name}?`;
    if (!confirm(confirmMessage)) return;

    const newDeleting = new Set(deleting);
    newDeleting.add(item.id);
    allItems.forEach(subItem => newDeleting.add(subItem.id));
    setDeleting(newDeleting);

    try {
      const deletePromises = allItems.map(subItem => {
        const endpoint = type === 'email' 
          ? `/api/history/emails/delete?id=${subItem.id}`
          : `/api/history/linkedin/delete?id=${subItem.id}`;
        
        return fetch(endpoint, { method: 'DELETE' });
      });

      const results = await Promise.all(deletePromises);
      
      const failedDeletions: HistoryItem[] = [];
      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          failedDeletions.push(allItems[i]);
        }
      }

      if (failedDeletions.length === 0) {
        allItems.forEach(subItem => onItemDeleted?.(subItem.id));
        showToast({
          type: "success",
          message: `All ${allItems.length} ${type === 'email' ? 'emails' : 'LinkedIn messages'} for ${item.company_name} deleted successfully`
        });
      } else {
        const successCount = allItems.length - failedDeletions.length;
        if (successCount > 0) {
          allItems.filter(subItem => !failedDeletions.includes(subItem)).forEach(subItem => onItemDeleted?.(subItem.id));
        }
        showToast({
          type: "error",
          message: `Failed to delete ${failedDeletions.length} items. ${successCount} items were deleted successfully.`
        });
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      showToast({
        type: "error",
        message: `Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      const newDeleting = new Set(deleting);
      newDeleting.delete(item.id);
      allItems.forEach(subItem => newDeleting.delete(subItem.id));
      setDeleting(newDeleting);
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
    <div className="space-y-2 sm:space-y-3">
      {items.map((item) => {
        const isExpanded = expandedItems.has(item.id);
        
        return (
          <Card key={item.id} className="group transition-all duration-200 hover:shadow-md">
            <CardContent className="p-0">
              {/* Header - Always Visible */}
              <div 
                className="flex items-start sm:items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpanded(item.id)}
              >
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="mt-1 sm:mt-0">{getIcon()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base text-slate-900 leading-tight sm:leading-normal">
                      <div className="truncate">
                        {type === 'email' && item.subject_line ? item.subject_line : `${type === 'email' ? 'Email' : 'LinkedIn message'} to ${item.company_name}`}
                      </div>
                      {item.total_count && item.total_count > 1 && (
                        <span className="mt-1 sm:mt-0 sm:ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.total_count} {type === 'email' ? 'emails' : 'messages'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500 mt-1">
                      <span className="truncate">{item.company_name}</span>
                      {item.role && (
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">{item.role}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">Latest: {formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(item.content);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 sm:p-2"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(item);
                    }}
                    disabled={deleting.has(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2"
                    title={`Delete all ${type === 'email' ? 'emails' : 'LinkedIn messages'} for ${item.company_name}`}
                  >
                    {deleting.has(item.id) ? (
                      <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                  
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-slate-100">
                  <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                    {/* Metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Latest: {formatDate(item.created_at)}</span>
                      </div>
                      {item.total_count && item.total_count > 1 && (
                        <div>
                          <span className="font-medium">Total:</span> {item.total_count} {type === 'email' ? 'emails' : 'messages'}
                        </div>
                      )}
                      {item.role && (
                        <div>
                          <span className="font-medium">Role:</span> {item.role}
                        </div>
                      )}
                    </div>

                    {/* Show all messages/emails if there are multiple */}
                    {item.total_count && item.total_count > 1 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-700">
                          All {type === 'email' ? 'Emails' : 'LinkedIn Messages'} for {item.company_name}
                        </h4>
                        <div className="max-h-72 sm:max-h-96 overflow-y-auto space-y-3 pr-2">
                          {(type === 'email' ? item.all_emails : item.all_messages)?.map((subItem, index) => (
                            <div key={subItem.id} className="bg-slate-50 rounded-lg p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                                <span className="text-xs sm:text-sm font-medium text-slate-700">
                                  {type === 'email' ? 'Email' : 'LinkedIn Message'} #{index + 1} - {formatDate(subItem.created_at)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(subItem.content)}
                                    className="text-xs hover:bg-blue-50 p-1 sm:p-2"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Copy</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete this ${type === 'email' ? 'email' : 'LinkedIn message'}?`)) {
                                        deleteItem(subItem);
                                      }
                                    }}
                                    disabled={deleting.has(subItem.id)}
                                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400 p-1 sm:p-2"
                                    title={`Delete this ${type === 'email' ? 'email' : 'LinkedIn message'}`}
                                  >
                                    {deleting.has(subItem.id) ? (
                                      <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap max-h-24 sm:max-h-32 overflow-y-auto">
                                {subItem.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Show single content
                      <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                          <span className="text-xs sm:text-sm font-medium text-slate-700">
                            {type === 'email' ? 'Email Content' : 'LinkedIn Message'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.content)}
                            className="text-xs p-1 sm:p-2 self-start sm:self-center"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Copy</span>
                          </Button>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap max-h-36 sm:max-h-48 overflow-y-auto">
                          {item.content}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(item.content)}
                        className="text-xs w-full sm:w-auto"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Latest {type === 'email' ? 'Email' : 'Message'}
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
                          className="text-xs w-full sm:w-auto"
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