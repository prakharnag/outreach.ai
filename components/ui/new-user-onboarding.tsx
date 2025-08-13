"use client";

import { Button } from "./button";
import { Search, Sparkles } from "lucide-react";

interface NewUserOnboardingProps {
  onStartOutreach: () => void;
}

export function NewUserOnboarding({ onStartOutreach }: NewUserOnboardingProps) {
  return (
    <div className="text-center py-20">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Sparkles className="h-20 w-20 text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Welcome to Outreach.ai
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Start your AI-powered outreach journey. Research companies, find contacts, and generate personalized messages in seconds.
          </p>
        </div>
        
        <Button
          onClick={onStartOutreach}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Search className="h-5 w-5 mr-3" />
          Start Outreach
        </Button>
        
        <div className="mt-8 text-sm text-slate-500">
          <p>✨ AI-powered company research</p>
          <p>📧 Personalized cold emails</p>
          <p>💼 LinkedIn message generation</p>
        </div>
      </div>
    </div>
  );
}