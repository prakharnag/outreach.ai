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
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Account Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-900">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-sm text-slate-500">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </div>

        {onClose && (
          <Button onClick={onClose} variant="ghost" className="w-full">
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}