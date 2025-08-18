"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";

interface ExpandableContentProps {
  title: string;
  preview: string;
  fullContent: string;
  type: 'email' | 'linkedin';
  date: string;
  company: string;
}

export function ExpandableContent({ 
  title, 
  preview, 
  fullContent, 
  type, 
  date, 
  company 
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getTypeLabel = () => {
    return type === 'email' ? 'Email' : 'LinkedIn Message';
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {getIcon()}
            <span className="truncate">{title}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="font-medium">{company}</span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(date)}
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
            {getTypeLabel()}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {!isExpanded ? (
            <div className="text-slate-700">
              <p className="line-clamp-2">{preview}</p>
              <button
                onClick={() => setIsExpanded(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-flex items-center gap-1"
              >
                Read more
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {fullContent}
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
              >
                Show less
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}