"use client";

import { useState, useEffect } from "react";
import { User, Mail, Building2, ExternalLink, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Badge } from "./badge";
import { Button } from "./button";
import { SourceLink } from "./source-link";

interface ContactResult {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  email_inferred?: boolean;
  confidence_score?: number;
  source_url?: string;
  source_title?: string;
  created_at: string;
}

interface ContactResultsTableProps {
  contacts: ContactResult[];
  loading?: boolean;
}

export function ContactResultsTable({ contacts, loading }: ContactResultsTableProps) {
  const [sortedContacts, setSortedContacts] = useState<ContactResult[]>([]);

  useEffect(() => {
    // Sort by creation date (newest first) and confidence score
    const sorted = [...contacts].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateB !== dateA) return dateB - dateA;
      
      const confidenceA = a.confidence_score || 0;
      const confidenceB = b.confidence_score || 0;
      return confidenceB - confidenceA;
    });
    setSortedContacts(sorted);
  }, [contacts]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getConfidenceBadge = (score?: number, inferred?: boolean) => {
    if (inferred) {
      return <Badge variant="outline" className="text-amber-600 border-amber-200">Inferred</Badge>;
    }
    
    if (!score) return null;
    
    if (score >= 0.8) {
      return <Badge variant="default" className="bg-green-100 text-green-800">High Confidence</Badge>;
    } else if (score >= 0.6) {
      return <Badge variant="secondary">Medium Confidence</Badge>;
    } else {
      return <Badge variant="outline" className="text-amber-600 border-amber-200">Low Confidence</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedContacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No contacts found yet</h3>
            <p className="text-slate-500">
              Complete company research to discover key contacts and their information
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Contact Results ({sortedContacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company & Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {contact.contact_name || 'Unknown Contact'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(contact.created_at)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {contact.company_name}
                      </div>
                      {contact.contact_title && (
                        <div className="text-sm text-slate-600 mt-1">
                          {contact.contact_title}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {contact.contact_email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="font-mono text-sm">{contact.contact_email}</span>
                        {contact.email_inferred && (
                          <AlertCircle className="h-4 w-4 text-amber-500" title="Email inferred from pattern" />
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">No email found</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {getConfidenceBadge(contact.confidence_score, contact.email_inferred)}
                  </TableCell>
                  
                  <TableCell>
                    {contact.source_url ? (
                      <SourceLink 
                        url={contact.source_url} 
                        title={contact.source_title || 'View Source'}
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">No source</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contact.contact_email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(contact.contact_email!)}
                          className="text-xs"
                        >
                          Copy Email
                        </Button>
                      )}
                      
                      {contact.contact_email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const mailtoUrl = `mailto:${contact.contact_email}?subject=Outreach from ${contact.company_name}`;
                            window.open(mailtoUrl);
                          }}
                          className="text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}