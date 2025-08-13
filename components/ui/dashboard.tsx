"use client";

import { Building2, Search, Clock, Sparkles } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { KPIDashboard } from "./kpi-dashboard";
import { CompanyDetails } from "./company-details";
import { useContactResults } from "../../hooks/useContactResults";
import { ContactResult } from "../../types";
import { useState } from "react";

interface DashboardProps {
  onStartResearch: () => void;
}

export function Dashboard({ onStartResearch }: DashboardProps) {
  const { contactResults, loading } = useContactResults();
  const [selectedCompany, setSelectedCompany] = useState<ContactResult | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
                Welcome to Outreach.ai
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
      <KPIDashboard />
      
      {/* Recent Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Recent Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contactResults.slice(0, 10).map((company) => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-slate-100"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {company.company_name}
                    </div>
                    {company.contact_name && (
                      <div className="text-sm text-slate-600">
                        {company.contact_name} • {company.contact_title}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    {formatDate(company.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                onClick={onStartResearch}
                className="w-full justify-start"
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                Research New Company
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}