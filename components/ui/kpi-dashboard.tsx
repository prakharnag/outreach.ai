"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Building2, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { getSupabaseClient } from "../../lib/supabase-singleton";

interface KPIStats {
  companiesResearched: number;
  highConfidenceContacts: number;
  successfulInferences: number;
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
    highConfidenceContacts: 0,
    successfulInferences: 0
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
        const hasAnyData = cachedStats.companiesResearched > 0;
        onDataLoad?.(hasAnyData);
        return;
      }
    }

    loadingRef.current = true;

    try {
      const [contactRes] = await Promise.all([
        fetch('/api/contact-results')
      ]);

      if (!mountedRef.current) return;

      if (contactRes.ok) {
        const [contacts] = await Promise.all([
          contactRes.json()
        ]);

        if (!mountedRef.current) return;

        // Calculate meaningful metrics from contact results
        const highConfidenceContacts = contacts.filter((c: any) => {
          try {
            // Check confidence from database fields
            const confidenceScore = c.confidence_score || 0;
            const hasDirectContactData = c.contact_name || c.contact_email;
            
            // Also check research_data JSON for contact info
            if (c.research_data) {
              const data = typeof c.research_data === 'string' ? JSON.parse(c.research_data) : c.research_data;
              const hasJsonContact = data.contact && (data.contact.name || data.contact.email);
              const jsonConfidence = data.confidence || (data.confidence_assessment?.level === 'High' ? 0.8 : 0.5);
              
              return (hasDirectContactData || hasJsonContact) && (confidenceScore >= 0.7 || jsonConfidence >= 0.7);
            }
            
            return hasDirectContactData && confidenceScore >= 0.7;
          } catch (error) {
            console.error('Error parsing contact data:', error);
            return false;
          }
        }).length;

        const successfulInferences = contacts.filter((c: any) => {
          try {
            // Check direct fields first
            if (c.email_inferred || c.contact_email) {
              return true;
            }
            
            // Check research_data JSON
            if (c.research_data) {
              const data = typeof c.research_data === 'string' ? JSON.parse(c.research_data) : c.research_data;
              
              // Check if contact has email or is inferred
              if (data.contact) {
                return data.contact.email || data.contact.inferred === true;
              }
              
              // Check contact_information field
              if (data.contact_information) {
                return data.contact_information.email || data.contact_information.inferred === true;
              }
            }
            
            return false;
          } catch (error) {
            console.error('Error parsing inference data:', error);
            return false;
          }
        }).length;

        const newStats = {
          companiesResearched: contacts.length,
          highConfidenceContacts,
          successfulInferences
        };
        
        setStats(newStats);
        setCachedData('kpi-stats', newStats);
        
        // Notify parent about data availability
        const hasAnyData = newStats.companiesResearched > 0;
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
      .channel('kpi_contact_updates_only')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'contact_results' },
        debouncedUpdate
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearTimeout(updateTimeout);
      emailChannel.unsubscribe();
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
          <CardTitle className="text-sm font-medium">High Quality Contacts</CardTitle>
          <Mail className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.highConfidenceContacts}</div>
          <p className="text-xs text-muted-foreground">Contacts with high confidence & data</p>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Successful Email Inferences</CardTitle>
          <MessageSquare className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.successfulInferences}</div>
          <p className="text-xs text-muted-foreground">Contact emails found or inferred</p>
        </CardContent>
      </Card>
    </div>
  );
}