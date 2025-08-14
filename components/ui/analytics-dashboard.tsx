"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { createClient } from "../../lib/supabase";

interface CompanyData {
  company: string;
  emails: number;
  linkedin: number;
  total: number;
}

interface DailyActivity {
  date: string;
  emails: number;
  linkedin: number;
}

export function AnalyticsDashboard() {
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [channelDistribution, setChannelDistribution] = useState([
    { name: 'Email', value: 0, color: '#3B82F6' }, 
    { name: 'LinkedIn', value: 0, color: '#8B5CF6' }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processCompanyData = useCallback((emails: any[], linkedin: any[]) => {
    const companyMap = new Map<string, { emails: number; linkedin: number }>();
    
    emails.forEach((email: any) => {
      if (email?.company_name) {
        const current = companyMap.get(email.company_name) || { emails: 0, linkedin: 0 };
        companyMap.set(email.company_name, { ...current, emails: current.emails + 1 });
      }
    });
    
    linkedin.forEach((msg: any) => {
      if (msg?.company_name) {
        const current = companyMap.get(msg.company_name) || { emails: 0, linkedin: 0 };
        companyMap.set(msg.company_name, { ...current, linkedin: current.linkedin + 1 });
      }
    });

    return Array.from(companyMap.entries())
      .map(([company, data]) => ({
        company: company.length > 15 ? company.substring(0, 15) + '...' : company,
        emails: data.emails,
        linkedin: data.linkedin,
        total: data.emails + data.linkedin
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, []);

  const processDailyActivity = useCallback((emails: any[], linkedin: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    // Pre-group data by date for O(n) complexity
    const emailsByDate = new Map<string, number>();
    const linkedinByDate = new Map<string, number>();

    emails.forEach((e: any) => {
      if (e?.created_at) {
        const date = e.created_at.split('T')[0];
        emailsByDate.set(date, (emailsByDate.get(date) || 0) + 1);
      }
    });

    linkedin.forEach((l: any) => {
      if (l?.created_at) {
        const date = l.created_at.split('T')[0];
        linkedinByDate.set(date, (linkedinByDate.get(date) || 0) + 1);
      }
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      emails: emailsByDate.get(date) || 0,
      linkedin: linkedinByDate.get(date) || 0
    }));
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setError(null);
      const responses = await Promise.allSettled([
        fetch('/api/history/emails'),
        fetch('/api/history/linkedin')
      ]);

      const emailRes = responses[0];
      const linkedinRes = responses[1];

      let emails: any[] = [];
      let linkedin: any[] = [];

      if (emailRes.status === 'fulfilled' && emailRes.value.ok) {
        emails = await emailRes.value.json();
      }

      if (linkedinRes.status === 'fulfilled' && linkedinRes.value.ok) {
        linkedin = await linkedinRes.value.json();
      }

      const companyAnalytics = processCompanyData(emails, linkedin);
      const dailyStats = processDailyActivity(emails, linkedin);

      const totalEmails = emails.length;
      const totalLinkedin = linkedin.length;
      const channelData = [
        { name: 'Email', value: totalEmails, color: '#3B82F6' },
        { name: 'LinkedIn', value: totalLinkedin, color: '#8B5CF6' }
      ];

      setCompanyData(companyAnalytics);
      setDailyActivity(dailyStats);
      setChannelDistribution(channelData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [processCompanyData, processDailyActivity]);

  useEffect(() => {
    loadAnalytics();

    const supabase = createClient();
    
    const emailChannel = supabase
      .channel('analytics_email_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_history' },
        () => setTimeout(loadAnalytics, 500)
      )
      .subscribe();
      
    const linkedinChannel = supabase
      .channel('analytics_linkedin_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'linkedin_history' },
        () => setTimeout(loadAnalytics, 500)
      )
      .subscribe();

    return () => {
      emailChannel.unsubscribe();
      linkedinChannel.unsubscribe();
    };
  }, [loadAnalytics]);

  const hasData = useMemo(() => 
    companyData.length > 0 || dailyActivity.some(d => d.emails > 0 || d.linkedin > 0),
    [companyData, dailyActivity]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-64 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-red-700 mb-2">Analytics Error</h3>
        <p className="text-red-500 mb-6">{error}</p>
        <button 
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Analytics Data Yet</h3>
        <p className="text-slate-500 mb-6">Start generating outreach messages to see insights and trends here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Companies by Outreach Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={companyData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="company" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="emails" fill="#3B82F6" name="Emails" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="linkedin" fill="#8B5CF6" name="LinkedIn" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Outreach Channel Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={channelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {channelDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            7-Day Activity Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <LineChart data={dailyActivity} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="emails" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  name="Emails"
                />
                <Line 
                  type="monotone" 
                  dataKey="linkedin" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  name="LinkedIn"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}