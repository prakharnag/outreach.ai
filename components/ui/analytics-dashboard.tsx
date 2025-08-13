"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
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
  const [channelDistribution, setChannelDistribution] = useState([{ name: 'Email', value: 0, color: '#3B82F6' }, { name: 'LinkedIn', value: 0, color: '#8B5CF6' }]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
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

        // Company-wise breakdown
        const companyMap = new Map<string, { emails: number; linkedin: number }>();
        
        emails.forEach((email: any) => {
          const current = companyMap.get(email.company_name) || { emails: 0, linkedin: 0 };
          companyMap.set(email.company_name, { ...current, emails: current.emails + 1 });
        });
        
        linkedin.forEach((msg: any) => {
          const current = companyMap.get(msg.company_name) || { emails: 0, linkedin: 0 };
          companyMap.set(msg.company_name, { ...current, linkedin: current.linkedin + 1 });
        });

        const companyAnalytics = Array.from(companyMap.entries())
          .map(([company, data]) => ({
            company: company.length > 15 ? company.substring(0, 15) + '...' : company,
            emails: data.emails,
            linkedin: data.linkedin,
            total: data.emails + data.linkedin
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        // Daily activity for last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const dailyStats = last7Days.map(date => {
          const dayEmails = emails.filter((e: any) => e.created_at.startsWith(date)).length;
          const dayLinkedin = linkedin.filter((l: any) => l.created_at.startsWith(date)).length;
          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            emails: dayEmails,
            linkedin: dayLinkedin
          };
        });

        // Channel distribution
        const totalEmails = emails.length;
        const totalLinkedin = linkedin.length;
        const channelData = [
          { name: 'Email', value: totalEmails, color: '#3B82F6' },
          { name: 'LinkedIn', value: totalLinkedin, color: '#8B5CF6' }
        ];

        setCompanyData(companyAnalytics);
        setDailyActivity(dailyStats);
        setChannelDistribution(channelData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    // Set up real-time subscriptions
    const supabase = createClient();
    
    const emailChannel = supabase
      .channel('analytics_email_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_history' },
        () => loadAnalytics()
      )
      .subscribe();
      
    const linkedinChannel = supabase
      .channel('analytics_linkedin_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'linkedin_history' },
        () => loadAnalytics()
      )
      .subscribe();

    return () => {
      emailChannel.unsubscribe();
      linkedinChannel.unsubscribe();
    };
  }, []);

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

  const hasData = companyData.length > 0 || dailyActivity.some(d => d.emails > 0 || d.linkedin > 0);

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
      {/* Top Row - Company Performance & Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company vs Messages Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Companies by Outreach Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="company" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
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
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Outreach Channel Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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

      {/* Daily Activity Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            7-Day Activity Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyActivity}>
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
        </CardContent>
      </Card>
    </div>
  );
}