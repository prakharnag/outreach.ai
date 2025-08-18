"use client";

import { useState, useEffect } from "react";
import { Building2, Search, Clock, BarChart3 } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { KPIDashboard } from "./kpi-dashboard";
import { NewUserOnboarding } from "./new-user-onboarding";
import { createClient } from "../../lib/supabase";

interface RecentCompany {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  confidence_score?: number;
  created_at: string;
}

interface HomeDashboardProps {
  onStartResearch: () => void;
  onCompanySelect: (company: RecentCompany) => void;
}

export function HomeDashboard({ onStartResearch, onCompanySelect }: HomeDashboardProps) {
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRecentCompanies = async () => {
    try {
      const res = await fetch('/api/contact-results');
      if (res.ok) {
        const data = await res.json();
        setRecentCompanies(data.slice(0, 10)); // Show last 10 companies
      }
    } catch (error) {
      console.error('Failed to load recent companies:', error);
    }
  };

  const checkHasData = async () => {
    try {
      const [emailRes, linkedinRes, contactRes] = await Promise.all([
        fetch('/api/history/emails'),
        fetch('/api/history/linkedin'),
        fetch('/api/contact-results')
      ]);
      
      if (emailRes.ok && linkedinRes.ok && contactRes.ok) {
        const [emails, linkedin, contacts] = await Promise.all([
          emailRes.json(),
          linkedinRes.json(),
          contactRes.json()
        ]);
        
        const totalData = emails.length + linkedin.length + contacts.length;
        setHasData(totalData > 0);
      }
    } catch (error) {
      console.error('Failed to check user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentCompanies();
    checkHasData();

    // Set up real-time subscriptions
    const supabase = createClient();
    
    const contactChannel = supabase
      .channel('home_contact_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contact_results' },
        () => {
          loadRecentCompanies();
          setHasData(true);
        }
      )
      .subscribe();

    const emailChannel = supabase
      .channel('home_email_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'email_history' },
        () => setHasData(true)
      )
      .subscribe();

    const linkedinChannel = supabase
      .channel('home_linkedin_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'linkedin_history' },
        () => setHasData(true)
      )
      .subscribe();

    return () => {
      contactChannel.unsubscribe();
      emailChannel.unsubscribe();
      linkedinChannel.unsubscribe();
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <KPIDashboard onDataLoad={setHasData} />
        <NewUserOnboarding onStartOutreach={onStartResearch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPIDashboard onDataLoad={setHasData} />
      
      {/* Recent Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCompanies.length > 0 ? (
              <div className="space-y-3">
                {recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => onCompanySelect(company)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-slate-100"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {company.company_name}
                      </div>
                      {company.contact_name && (
                        <div className="text-sm text-slate-600">
                          {company.contact_name} • {company.contact_title}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="h-4 w-4" />
                      {formatDate(company.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No companies researched yet</p>
                <Button
                  onClick={onStartResearch}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Start Research
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={onStartResearch}
                className="justify-start h-9"
                variant="outline"
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Research New Company
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard?tab=analytics'}
                className="justify-start h-9"
                variant="ghost"
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard?tab=history'}
                className="justify-start h-9"
                variant="ghost"
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}