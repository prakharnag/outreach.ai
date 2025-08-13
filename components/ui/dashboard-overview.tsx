"use client";

import { useState, useEffect } from "react";
import { Search, Mail, MessageSquare, Building2, Users, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface DashboardStats {
  companiesResearched: number;
  contactsFound: number;
  emailsSent: number;
  linkedinSent: number;
  recentActivity: Array<{
    id: string;
    type: 'research' | 'email' | 'linkedin';
    company: string;
    date: string;
    status: 'completed' | 'pending';
  }>;
}

interface DashboardOverviewProps {
  onStartResearch: () => void;
}

export function DashboardOverview({ onStartResearch }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    companiesResearched: 0,
    contactsFound: 0,
    emailsSent: 0,
    linkedinSent: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        const [emailRes, linkedinRes] = await Promise.all([
          fetch('/api/history/emails'),
          fetch('/api/history/linkedin')
        ]);

        if (emailRes.ok && linkedinRes.ok) {
          const [emails, linkedin] = await Promise.all([
            emailRes.json(),
            linkedinRes.json()
          ]);

          // Calculate unique companies researched
          const allCompanies = new Set([
            ...emails.map((e: any) => e.company_name),
            ...linkedin.map((l: any) => l.company_name)
          ]);

          // Create recent activity feed
          const recentActivity = [
            ...emails.slice(0, 3).map((email: any) => ({
              id: email.id,
              type: 'email' as const,
              company: email.company_name,
              date: email.created_at,
              status: 'completed' as const
            })),
            ...linkedin.slice(0, 3).map((msg: any) => ({
              id: msg.id,
              type: 'linkedin' as const,
              company: msg.company_name,
              date: msg.created_at,
              status: 'completed' as const
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

          setStats({
            companiesResearched: allCompanies.size,
            contactsFound: allCompanies.size, // Assuming 1 contact per company for now
            emailsSent: emails.length,
            linkedinSent: linkedin.length,
            recentActivity
          });
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardStats, 30000);
    return () => clearInterval(interval);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4 text-blue-600" />;
      case 'linkedin': return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'research': return <Search className="h-4 w-4 text-green-600" />;
      default: return <Building2 className="h-4 w-4 text-slate-600" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email sent';
      case 'linkedin': return 'LinkedIn message';
      case 'research': return 'Company researched';
      default: return 'Activity';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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

  const hasActivity = stats.companiesResearched > 0 || stats.emailsSent > 0 || stats.linkedinSent > 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          {hasActivity ? 'Dashboard Overview' : 'Welcome to Outreach.ai'}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {hasActivity 
            ? 'Track your outreach performance and manage your campaigns'
            : 'AI-powered company research and personalized outreach automation'
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies Researched</CardTitle>
            <Building2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.companiesResearched}</div>
            <p className="text-xs text-muted-foreground">Total companies analyzed</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts Found</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.contactsFound}</div>
            <p className="text-xs text-muted-foreground">Key contacts identified</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cold Emails</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.emailsSent}</div>
            <p className="text-xs text-muted-foreground">Personalized emails generated</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LinkedIn Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.linkedinSent}</div>
            <p className="text-xs text-muted-foreground">Professional messages created</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Research CTA */}
        <Card className="card-hover border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-900">Start New Research</h3>
                <p className="text-sm text-blue-700">
                  Research a company and generate personalized outreach messages
                </p>
              </div>
              <Search className="h-8 w-8 text-blue-600" />
            </div>
            <Button 
              onClick={onStartResearch}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Research Company
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {getActivityLabel(activity.type)} to {activity.company}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(activity.date)}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Start researching to see activity here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}