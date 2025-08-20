"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "./dashboard/page";
import AuthPage from "./auth/page";
import LandingPage from "./landingpage/page";
import { useAuth } from "../contexts/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check URL for auth parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'true' || window.location.pathname === '/auth') {
      setShowAuth(true);
    } else {
      // Reset showAuth if we're not on auth page
      setShowAuth(false);
    }
  }, []);

  useEffect(() => {
    // Listen for route changes to update showAuth state
    const handleRouteChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth') === 'true' || window.location.pathname === '/auth') {
        setShowAuth(true);
      } else {
        setShowAuth(false);
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
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


