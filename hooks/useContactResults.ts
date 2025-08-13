"use client";

import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase";
import { ContactResult } from "../types";

export function useContactResults() {
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContactResults = async () => {
    try {
      const res = await fetch('/api/contact-results');
      if (res.ok) {
        const data = await res.json();
        setContactResults(data);
      } else {
        setError('Failed to load contact results');
      }
    } catch (err) {
      setError('Failed to load contact results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactResults();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel('contact_results_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contact_results' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setContactResults(prev => [payload.new as ContactResult, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setContactResults(prev => 
              prev.map(item => item.id === payload.new.id ? payload.new as ContactResult : item)
            );
          } else if (payload.eventType === 'DELETE') {
            setContactResults(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { contactResults, loading, error, refetch: loadContactResults };
}