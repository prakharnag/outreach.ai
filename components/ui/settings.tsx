"use client";

import { useState, useEffect } from "react";
import { User, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { signOut, getCurrentUser } from "../../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface SettingsProps {
  onClose?: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-sm sm:max-w-md mx-auto">
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-center text-sm sm:text-base">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm sm:max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Account Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* User Info */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 rounded-lg">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 text-sm sm:text-base truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 sm:space-y-3">
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-9 sm:h-10 text-sm sm:text-base"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>

        {onClose && (
          <Button onClick={onClose} variant="ghost" className="w-full h-9 sm:h-10 text-sm sm:text-base">
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}