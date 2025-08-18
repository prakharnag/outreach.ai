"use client";

import { Building2, Search, Clock, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { KPIDashboard } from "./kpi-dashboard";
import { CompanyDetails } from "./company-details";
import { useContactResults } from "../../hooks/useContactResults";
import { ContactResult } from "../../types";
import { useState } from "react";

interface DashboardProps {
  onStartResearch: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToEmailHistory?: () => void;
  onNavigateToLinkedInHistory?: () => void;
}

export function Dashboard({ 
  onStartResearch, 
  onNavigateToAnalytics, 
  onNavigateToEmailHistory, 
  onNavigateToLinkedInHistory 
}: DashboardProps) {
  const { contactResults, loading, error } = useContactResults();
  const [selectedCompany, setSelectedCompany] = useState<ContactResult | null>(null);

  const formatDate = (dateString: string, updatedString?: string) => {
    const date = new Date(dateString);
    const updated = updatedString ? new Date(updatedString) : null;
    const now = new Date();
    
    // Use updated date if it's different from created date (indicating an update)
    const displayDate = updated && Math.abs(updated.getTime() - date.getTime()) > 1000 ? updated : date;
    const isUpdated = updated && Math.abs(updated.getTime() - date.getTime()) > 1000;
    
    const diffMs = now.getTime() - displayDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeText = '';
    if (diffHours < 1) timeText = 'Just now';
    else if (diffHours < 24) timeText = `${diffHours}h ago`;
    else if (diffDays < 7) timeText = `${diffDays}d ago`;
    else timeText = displayDate.toLocaleDateString();
    
    return { timeText, isUpdated };
  };

  if (selectedCompany) {
    return (
      <CompanyDetails 
        company={selectedCompany} 
        onClose={() => setSelectedCompany(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasData = contactResults.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <KPIDashboard />
        
        {/* New User Onboarding */}
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <Sparkles className="h-20 w-20 text-blue-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-800 mb-4">
                Welcome to Outreach
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Start your AI-powered outreach journey. Research companies, find contacts, and generate personalized messages in seconds.
              </p>
            </div>
            
            <Button
              onClick={onStartResearch}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Search className="h-5 w-5 mr-3" />
              Start Research
            </Button>
            
            <div className="mt-8 text-sm text-slate-500">
              <p>✨ AI-powered company research</p>
              <p>📧 Personalized cold emails</p>
              <p>💼 LinkedIn message generation</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <KPIDashboard />
      
      {/* Searched Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Searched Companies ({contactResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {contactResults.map((company) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-slate-100"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      {company.company_name}
                      {company.confidence_score && company.confidence_score < 0.7 && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Partial Data
                        </span>
                      )}
                    </div>
                    {company.contact_name && (
                      <div className="text-sm text-slate-600">
                        {company.contact_name} • {company.contact_title}
                        {company.confidence_score && (
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            company.confidence_score >= 0.8 ? 'bg-green-100 text-green-800' :
                            company.confidence_score >= 0.7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {company.confidence_score >= 0.8 ? 'High' :
                             company.confidence_score >= 0.7 ? 'Medium' : 'Low'} Confidence
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    {(() => {
                      const { timeText, isUpdated } = formatDate(company.created_at, company.updated_at);
                      return (
                        <span className="flex items-center gap-1">
                          {timeText}
                          {isUpdated && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              Updated
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={onStartResearch}
                className="justify-start h-9"
                variant="outline"
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Research New Company
              </Button>
              <Button
                onClick={onNavigateToAnalytics}
                className="justify-start h-9"
                variant="ghost"
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button
                onClick={onNavigateToEmailHistory}
                className="justify-start h-9"
                variant="ghost"
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                Email History
              </Button>
              <Button
                onClick={onNavigateToLinkedInHistory}
                className="justify-start h-9"
                variant="ghost"
                size="sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                LinkedIn History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}