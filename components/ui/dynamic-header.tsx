"use client";

import { Button } from "./button";
import { Search } from "lucide-react";

interface DynamicHeaderProps {
  currentView: string;
  userName?: string;
  onOpenSearch: () => void;
}

export function DynamicHeader({ currentView, userName, onOpenSearch }: DynamicHeaderProps) {
  const getPageTitle = () => {
    switch (currentView) {
      case "home":
        return "Dashboard";
      case "research":
        return "Research";
      case "analytics":
        return "Analytics";
      case "email":
        return "Email History";
      case "linkedin":
        return "LinkedIn History";
      case "settings":
        return "Settings";
      default:
        return "Dashboard";
    }
  };

  const showWelcome = currentView === "home";
  const showResearchButton = !showWelcome;

  return (
    <div className="py-6 px-6 border-b border-white/30 relative flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          {getPageTitle()}
        </h1>
        <p className="text-slate-600">
          {currentView === "home" && "Monitor your outreach performance and manage campaigns"}
          {currentView === "research" && "AI-powered company research and outreach generation"}
          {currentView === "analytics" && "Track your outreach performance and activity"}
          {currentView === "email" && "Your generated cold emails"}
          {currentView === "linkedin" && "Your generated LinkedIn messages"}
          {currentView === "settings" && "Manage your account and preferences"}
        </p>
      </div>
      
      <div className="flex items-center">
        {showWelcome && userName && (
          <span className="text-slate-700 font-medium">
            Welcome, {userName}
          </span>
        )}
        
        {showResearchButton && (
          <Button
            onClick={onOpenSearch}
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Search className="h-4 w-4 mr-2" />
            AI Company Research
          </Button>
        )}
      </div>
    </div>
  );
}