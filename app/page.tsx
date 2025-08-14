"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "./dashboard/page";
import AuthPage from "./auth/page";
import LandingPage from "./landingpage/page";
import { getCurrentUser, supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: any, session: any) => {
        if (event === 'SIGNED_IN' && session?.user && !user) {
          setUser(session.user);
          setShowAuth(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setShowAuth(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [user]);

  useEffect(() => {
    // Check URL for auth parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'true' || window.location.pathname === '/auth') {
      setShowAuth(true);
    }
  }, []);

  useEffect(() => {
    // Only check URL on mount, not on every change
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'true' || window.location.pathname === '/auth') {
      setShowAuth(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen gradient-blue flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  // Show auth page if requested or if URL has auth parameter
  if (showAuth && !user) {
    return <AuthPage />;
  }

  // Show dashboard if authenticated
  if (user) {
    return <Dashboard />;
  }

  // Show landing page by default
  return <LandingPage />;
}


