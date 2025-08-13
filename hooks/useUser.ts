"use client";

import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Try to get full name from user metadata or profile
          const fullName = authUser.user_metadata?.full_name || 
                          authUser.user_metadata?.name ||
                          `${authUser.user_metadata?.first_name || ''} ${authUser.user_metadata?.last_name || ''}`.trim() ||
                          authUser.email?.split('@')[0];
          
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            full_name: fullName,
            first_name: authUser.user_metadata?.first_name,
            last_name: authUser.user_metadata?.last_name
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        const authUser = session.user;
        const fullName = authUser.user_metadata?.full_name || 
                        authUser.user_metadata?.name ||
                        `${authUser.user_metadata?.first_name || ''} ${authUser.user_metadata?.last_name || ''}`.trim() ||
                        authUser.email?.split('@')[0];
        
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          full_name: fullName,
          first_name: authUser.user_metadata?.first_name,
          last_name: authUser.user_metadata?.last_name
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}