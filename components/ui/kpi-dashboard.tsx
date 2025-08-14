"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Building2, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { getSupabaseClient } from "../../lib/supabase-singleton";

interface KPIStats {
  companiesResearched: number;
  totalEmails: number;
  totalLinkedIn: number;
}

interface KPIDashboardProps {
  onDataLoad?: (hasData: boolean) => void;
}

// In-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export function KPIDashboard({ onDataLoad }: KPIDashboardProps) {
  const [stats, setStats] = useState<KPIStats>({
    companiesResearched: 0,
    totalEmails: 0,
    totalLinkedIn: 0
  });
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadStats = useCallback(async (useCache = true) => {
    if (loadingRef.current) return;
    
    // Check cache first
    if (useCache) {
      const cachedStats = getCachedData('kpi-stats');
      if (cachedStats) {
        setStats(cachedStats);
        setLoading(false);
        const hasAnyData = cachedStats.companiesResearched > 0 || cachedStats.totalEmails > 0 || cachedStats.totalLinkedIn > 0;
        onDataLoad?.(hasAnyData);
        return;
      }
    }

    loadingRef.current = true;

    try {
      const [emailRes, linkedinRes, contactRes] = await Promise.all([
        fetch('/api/history/emails'),
        fetch('/api/history/linkedin'),
        fetch('/api/contact-results')
      ]);

      if (!mountedRef.current) return;

      if (emailRes.ok && linkedinRes.ok && contactRes.ok) {
        const [emails, linkedin, contacts] = await Promise.all([
          emailRes.json(),
          linkedinRes.json(),
          contactRes.json()
        ]);

        if (!mountedRef.current) return;

        // Calculate unique companies from all sources
        const allCompanies = new Set([
          ...emails.map((e: any) => e.company_name),
          ...linkedin.map((l: any) => l.company_name),
          ...contacts.map((c: any) => c.company_name)
        ]);

        const newStats = {
          companiesResearched: allCompanies.size,
          totalEmails: emails.length,
          totalLinkedIn: linkedin.length
        };
        
        setStats(newStats);
        setCachedData('kpi-stats', newStats);
        
        // Notify parent about data availability
        const hasAnyData = newStats.companiesResearched > 0 || newStats.totalEmails > 0 || newStats.totalLinkedIn > 0;
        onDataLoad?.(hasAnyData);
      }
    } catch (error) {
      console.error('Failed to load KPI stats:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [onDataLoad]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial load with cache
    loadStats(true);

    // Set up real-time subscriptions with debouncing
    const supabase = getSupabaseClient();
    let updateTimeout: NodeJS.Timeout;

    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        if (mountedRef.current) {
          loadStats(false); // Skip cache on real-time updates
        }
      }, 1000); // 1 second debounce
    };
    
    const emailChannel = supabase
      .channel('kpi_email_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_history' },
        debouncedUpdate
      )
      .subscribe();
      
    const linkedinChannel = supabase
      .channel('kpi_linkedin_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'linkedin_history' },
        debouncedUpdate
      )
      .subscribe();
      
    const contactChannel = supabase
      .channel('kpi_contact_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contact_results' },
        debouncedUpdate
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearTimeout(updateTimeout);
      emailChannel.unsubscribe();
      linkedinChannel.unsubscribe();
      contactChannel.unsubscribe();
    };
  }, [loadStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
          <CardTitle className="text-sm font-medium">Total Cold Emails Generated</CardTitle>
          <Mail className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.totalEmails}</div>
          <p className="text-xs text-muted-foreground">Personalized emails created</p>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total LinkedIn Messages Generated</CardTitle>
          <MessageSquare className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.totalLinkedIn}</div>
          <p className="text-xs text-muted-foreground">Professional messages created</p>
        </CardContent>
      </Card>
    </div>
  );
}