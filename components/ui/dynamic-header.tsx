"use client";

import { Button } from "./button";
import { Search } from "lucide-react";
import Image from "next/image";

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

  const getPageDescription = () => {
    switch (currentView) {
      case "home":
        return "Monitor your outreach performance and manage campaigns";
      case "research":
        return "AI-powered company research and outreach generation";
      case "analytics":
        return "Track your outreach performance and activity";
      case "email":
        return "Your generated cold emails";
      case "linkedin":
        return "Your generated LinkedIn messages";
      case "settings":
        return "Manage your account and preferences";
      default:
        return "Monitor your outreach performance and manage campaigns";
    }
  };

  const showWelcome = currentView === "home";
  const showResearchButton = !showWelcome;

  return (
    <div className="py-4 sm:py-6 px-3 sm:px-6 border-b border-white/30 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
        <Image
          src="/assets/outreach.png"
          alt="Outreach"
          width={50}
          height={32}
          className="w-8 h-6 sm:w-12 sm:h-10 flex-shrink-0"
          priority
        />
        <div className="min-w-0 flex-1 sm:flex-none">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-1 sm:mb-2 truncate">
            {getPageTitle()}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-tight sm:leading-normal">
            {getPageDescription()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full sm:w-auto">
        {showWelcome && userName && (
          <span className="text-sm sm:text-base text-slate-700 font-medium truncate mr-3 sm:mr-0">
            Welcome, {userName}
          </span>
        )}
        
        {showResearchButton && (
          <Button
            onClick={onOpenSearch}
            variant="outline"
            className="bg-white/80 hover:bg-white border-slate-200 text-slate-700 hover:text-slate-900 text-sm sm:text-base px-3 sm:px-4 py-2"
          >
            <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="hidden sm:inline">New Research</span>
            <span className="sm:hidden">Research</span>
          </Button>
        )}
      </div>
    </div>
  );
}