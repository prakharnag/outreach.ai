"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Building2, TrendingUp, Globe, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { createClient } from "../../lib/supabase";

interface IndustryData {
  industry: string;
  companies: number;
  percentage: number;
  avgConfidence: number;
}

interface CompanySizeData {
  size: string;
  count: number;
  percentage: number;
}

interface ResearchTrend {
  date: string;
  searches: number;
  highQuality: number;
}

export function AnalyticsDashboard() {
  const [industryData, setIndustryData] = useState<IndustryData[]>([]);
  const [companySizeData, setCompanySizeData] = useState<CompanySizeData[]>([]);
  const [researchTrends, setResearchTrends] = useState<ResearchTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine company size based on employee count or revenue indicators
  const determineCompanySize = useCallback((researchData: any) => {
    try {
      const data = typeof researchData === 'string' ? JSON.parse(researchData) : researchData;
      
      let allText = '';
      
      // Handle both old and new data formats
      if (data?.company_overview) {
        allText += data.company_overview.toLowerCase();
        
        const businessPoints = data?.key_business_points || {};
        Object.values(businessPoints).forEach((point: any) => {
          if (point && point.description) {
            allText += ` ${point.description}`.toLowerCase();
          }
        });
      }
      
      // Old format: research field + verified_points
      if (data?.research && typeof data.research === 'string') {
        allText += ` ${data.research}`.toLowerCase();
      }
      
      if (data?.verified_points && Array.isArray(data.verified_points)) {
        data.verified_points.forEach((point: any) => {
          if (typeof point === 'string') {
            allText += ` ${point}`.toLowerCase();
          } else if (point && point.claim) {
            allText += ` ${point.claim}`.toLowerCase();
          }
        });
      }
      
      // Look for employee count indicators
      const employeeRegex = /(\d+(?:,\d+)*)\s*(?:employees?|people|staff|team members?|workforce)/gi;
      const matches = allText.match(employeeRegex);
      
      if (matches) {
        const numbers = matches.map(match => {
          const num = match.match(/(\d+(?:,\d+)*)/);
          return num ? parseInt(num[1].replace(/,/g, '')) : 0;
        }).filter(n => n > 0);
        
        if (numbers.length > 0) {
          const employees = Math.max(...numbers); // Take the largest number found
          if (employees >= 10000) return 'Enterprise (10k+)';
          if (employees >= 1000) return 'Large (1k-10k)';
          if (employees >= 100) return 'Medium (100-1k)';
          if (employees >= 10) return 'Small (10-100)';
          return 'Startup (<10)';
        }
      }
      
      // Look for revenue indicators
      const revenueRegex = /\$(\d+(?:\.\d+)?)\s*(?:million|billion|M|B)/gi;
      const revenueMatches = allText.match(revenueRegex);
      
      if (revenueMatches) {
        const revenues = revenueMatches.map(match => {
          const num = match.match(/\$(\d+(?:\.\d+)?)/);
          const multiplier = match.toLowerCase().includes('billion') || match.toLowerCase().includes('b') ? 1000 : 1;
          return num ? parseFloat(num[1]) * multiplier : 0;
        }).filter(r => r > 0);
        
        if (revenues.length > 0) {
          const revenue = Math.max(...revenues); // Take the largest revenue found
          if (revenue >= 1000) return 'Enterprise (10k+)'; // $1B+
          if (revenue >= 100) return 'Large (1k-10k)'; // $100M+
          if (revenue >= 10) return 'Medium (100-1k)'; // $10M+
          return 'Small (10-100)'; // Under $10M
        }
      }
      
      // Analyze description for size indicators
      if (allText.includes('fortune 500') || allText.includes('multinational') || allText.includes('global enterprise')) {
        return 'Enterprise (10k+)';
      }
      if (allText.includes('startup') || allText.includes('founded 20') || allText.includes('early stage')) {
        return 'Startup (<10)';
      }
      if (allText.includes('scale') || allText.includes('growth stage') || allText.includes('series b') || allText.includes('series c')) {
        return 'Medium (100-1k)';
      }
      if (allText.includes('seed') || allText.includes('pre-seed') || allText.includes('series a')) {
        return 'Small (10-100)';
      }
      
      // Better defaults based on company type
      if (allText.includes('corporation') || allText.includes('inc') || allText.includes('ltd')) {
        return 'Medium (100-1k)';
      }
      if (allText.includes('llc') || allText.includes('company')) {
        return 'Small (10-100)';
      }
      
      // Default to Small for most companies instead of Unknown
      return 'Small (10-100)';
    } catch (error) {
      console.log('Company size extraction error:', error);
      return 'Small (10-100)'; // Better default than Unknown
    }
  }, []);

  // Extract industry from research data
  const extractIndustry = useCallback((researchData: any) => {
    try {
      const data = typeof researchData === 'string' ? JSON.parse(researchData) : researchData;
      
      // Look for industry indicators in multiple possible fields
      const industryFields = [
        data?.industry, 
        data?.sector, 
        data?.business_type, 
        data?.category,
        data?.company_industry,
        data?.business_sector,
        data?.market_sector
      ];
      
      for (const field of industryFields) {
        if (field && typeof field === 'string' && field.trim().length > 0) {
          return field.toString().trim();
        }
      }
      
      // Handle both old and new data formats
      let allText = '';
      
      // New format: company_overview + key_business_points
      if (data?.company_overview) {
        allText += data.company_overview.toLowerCase();
        
        const businessPoints = data?.key_business_points || {};
        Object.values(businessPoints).forEach((point: any) => {
          if (point && point.description) {
            allText += ` ${point.description}`.toLowerCase();
          }
        });
      }
      
      // Old format: research field (text) + verified_points
      if (data?.research && typeof data.research === 'string') {
        allText += ` ${data.research}`.toLowerCase();
      }
      
      if (data?.verified_points && Array.isArray(data.verified_points)) {
        data.verified_points.forEach((point: any) => {
          if (typeof point === 'string') {
            allText += ` ${point}`.toLowerCase();
          } else if (point && point.claim) {
            allText += ` ${point.claim}`.toLowerCase();
          }
        });
      }
      
      // If still no text, fall back to company name analysis
      if (!allText.trim()) {
        allText = (data?.company_name || '').toLowerCase();
      }
      
      const industryKeywords = {
        'Technology': [
          'software', 'tech', 'ai', 'digital', 'platform', 'saas', 'cloud', 'data', 'analytics', 
          'cybersecurity', 'blockchain', 'api', 'app', 'mobile', 'web', 'application',
          'machine learning', 'artificial intelligence', 'automation', 'developer', 'programming',
          'startup', 'technical', 'engineering', 'innovation', 'algorithm', 'database', 'streaming',
          'music streaming', 'audio', 'podcast', 'spotify', 'technology', 'computer', 'internet',
          'coding', 'development', 'framework', 'infrastructure', 'computing', 'server'
        ],
        'Media & Entertainment': [
          'media', 'entertainment', 'content', 'publishing', 'gaming', 'streaming', 'music',
          'video', 'film', 'news', 'marketing', 'advertising', 'social media', 'podcast',
          'audio', 'spotify', 'netflix', 'youtube', 'creator', 'broadcast', 'television',
          'radio', 'production', 'studio', 'creative', 'artist', 'musician'
        ],
        'E-commerce': [
          'ecommerce', 'retail', 'marketplace', 'online store', 'shopping', 'commerce',
          'e-commerce', 'selling', 'dropshipping', 'fulfillment', 'logistics', 'consumer',
          'amazon', 'shopify', 'etsy', 'ebay', 'store', 'sales', 'merchandise', 'product'
        ],
        'Finance': [
          'bank', 'finance', 'investment', 'insurance', 'trading', 'loan', 'credit',
          'financial', 'payments', 'accounting', 'wealth', 'capital', 'funding', 'venture',
          'private equity', 'hedge fund', 'cryptocurrency', 'defi', 'fintech', 'money',
          'payment', 'transaction', 'banking', 'investment', 'portfolio', 'asset'
        ],
        'Healthcare': [
          'health', 'medical', 'pharma', 'biotech', 'hospital', 'clinic', 'healthcare', 
          'medicine', 'pharmaceutical', 'biomedical', 'therapy', 'treatment', 'diagnostics',
          'wellness', 'fitness', 'mental health', 'telemedicine', 'patient', 'doctor',
          'nurse', 'care', 'drug', 'vaccine', 'research', 'clinical'
        ],
        'Manufacturing': [
          'manufacturing', 'production', 'factory', 'industrial', 'automotive', 'aerospace',
          'chemicals', 'materials', 'textiles', 'machinery', 'equipment', 'supply chain',
          'assembly', 'fabrication', 'processing', 'construction', 'building', 'steel'
        ],
        'Consulting': [
          'consulting', 'advisory', 'services', 'professional services', 'strategy',
          'management consulting', 'business consulting', 'transformation', 'consultant',
          'advisor', 'guidance', 'expertise', 'solutions', 'implementation'
        ],
        'Education': [
          'education', 'learning', 'university', 'training', 'school', 'academic',
          'e-learning', 'online learning', 'curriculum', 'teaching', 'tutoring', 'edtech',
          'student', 'course', 'classroom', 'instructor', 'educational', 'knowledge'
        ],
        'Real Estate': [
          'real estate', 'property', 'construction', 'architecture', 'development',
          'housing', 'commercial property', 'residential', 'building', 'land', 'broker',
          'agent', 'investment property', 'rental', 'lease'
        ],
        'Food & Beverage': [
          'food', 'restaurant', 'beverage', 'catering', 'hospitality', 'culinary',
          'dining', 'cafe', 'bar', 'nutrition', 'organic', 'cooking', 'chef', 'kitchen',
          'meal', 'delivery', 'takeout', 'grocery', 'supermarket'
        ],
        'Transportation': [
          'transportation', 'logistics', 'shipping', 'delivery', 'travel', 'airline',
          'automotive', 'trucking', 'mobility', 'ride sharing', 'uber', 'lyft', 'taxi',
          'freight', 'cargo', 'vehicle', 'fleet', 'transit'
        ],
        'Energy': [
          'energy', 'renewable', 'solar', 'wind', 'oil', 'gas', 'utilities', 'power',
          'electricity', 'nuclear', 'battery', 'green energy', 'electric', 'fuel',
          'coal', 'hydroelectric', 'geothermal', 'sustainable'
        ]
      };
      
      // Score each industry based on keyword matches
      const industryScores: { [key: string]: number } = {};
      
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        let score = 0;
        keywords.forEach(keyword => {
          const keywordCount = (allText.match(new RegExp(keyword, 'g')) || []).length;
          score += keywordCount;
        });
        if (score > 0) {
          industryScores[industry] = score;
        }
      }
      
      // If no matches, try more specific company name-based detection
      if (Object.keys(industryScores).length === 0) {
        const companyName = (data?.company_name || '').toLowerCase();
        
        // Specific company patterns
        if (companyName.includes('spotify') || companyName.includes('music') || companyName.includes('audio')) {
          return 'Media & Entertainment';
        }
        if (companyName.includes('tech') || companyName.includes('software') || companyName.includes('app')) {
          return 'Technology';
        }
        if (companyName.includes('bank') || companyName.includes('pay') || companyName.includes('finance')) {
          return 'Finance';
        }
        if (companyName.includes('health') || companyName.includes('medical') || companyName.includes('care')) {
          return 'Healthcare';
        }
        if (companyName.includes('food') || companyName.includes('restaurant') || companyName.includes('cafe')) {
          return 'Food & Beverage';
        }
        if (companyName.includes('shop') || companyName.includes('store') || companyName.includes('retail')) {
          return 'E-commerce';
        }
        
        // If text exists but no keywords matched, classify as Technology (most common for startups)
        if (allText.trim().length > 50) {
          return 'Technology';
        }
        
        return 'Services'; // Better default than "Other"
      }
      
      // Return the industry with the highest score
      const topIndustry = Object.entries(industryScores)
        .sort(([,a], [,b]) => b - a)[0][0];
      return topIndustry;
      
    } catch (error) {
      console.log('Industry extraction error:', error);
      return 'Technology'; // Default to Technology instead of "Other"
    }
  }, []);

  // Calculate confidence score
  const calculateConfidence = useCallback((result: any) => {
    try {
      const data = typeof result.research_data === 'string' 
        ? JSON.parse(result.research_data) 
        : result.research_data;
      
      let score = 0;
      let factors = 0;
      
      // Handle both old and new data formats for contact information
      let contactInfo = data?.contact_information || data?.contact;
      
      if (contactInfo?.email) { score += 25; factors++; }
      if (contactInfo?.name) { score += 15; factors++; }
      if (contactInfo?.title) { score += 10; factors++; }
      
      // Handle both old and new data formats for content
      let hasContent = false;
      
      // New format: company_overview + key_business_points
      if (data?.company_overview && data.company_overview.length > 100) { 
        score += 20; factors++; hasContent = true; 
      }
      
      const businessPoints = data?.key_business_points || {};
      const pointCount = Object.keys(businessPoints).length;
      if (pointCount >= 3) { score += 15; factors++; hasContent = true; }
      else if (pointCount >= 1) { score += 10; factors++; hasContent = true; }
      
      // Old format: research text + verified_points
      if (!hasContent && data?.research && data.research.length > 100) {
        score += 20; factors++;
      }
      
      if (data?.verified_points && Array.isArray(data.verified_points)) {
        const verifiedCount = data.verified_points.length;
        if (verifiedCount >= 3) { score += 15; factors++; }
        else if (verifiedCount >= 1) { score += 10; factors++; }
      }
      
      // Confidence assessment (both formats)
      const confidenceAssessment = data?.confidence_assessment || data?.confidence;
      if (confidenceAssessment) {
        if (typeof confidenceAssessment === 'string') {
          switch (confidenceAssessment.toLowerCase()) {
            case 'high': score += 15; factors++; break;
            case 'medium': score += 10; factors++; break;
            case 'low': score += 5; factors++; break;
          }
        } else if (confidenceAssessment.level) {
          switch (confidenceAssessment.level.toLowerCase()) {
            case 'high': score += 15; factors++; break;
            case 'medium': score += 10; factors++; break;
            case 'low': score += 5; factors++; break;
          }
        }
      }
      
      return factors > 0 ? Math.min(score, 100) : 0;
    } catch (error) {
      console.log('Confidence calculation error:', error);
      return 0;
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/contact-results');
      
      if (!response.ok) {
        throw new Error('Failed to fetch contact results');
      }
      
      const contactResults = await response.json();
      
      // Process industry distribution
      const industryMap = new Map<string, { count: number; totalConfidence: number }>();
      const sizeMap = new Map<string, number>();
      
      contactResults.forEach((result: any, index: number) => {
        // Industry analysis
        const industry = extractIndustry(result.research_data);
        const confidence = calculateConfidence(result);
        
        // Debug logging for first few results
        if (index < 5) {
          console.log(`[Analytics Debug ${index}] Company: ${result.company_name}`);
          console.log(`[Analytics Debug ${index}] Extracted Industry: ${industry}`);
          console.log(`[Analytics Debug ${index}] Research Data Sample:`, 
            typeof result.research_data === 'string' 
              ? result.research_data.slice(0, 300) 
              : JSON.stringify(result.research_data).slice(0, 300)
          );
          
          // Check what text we're analyzing
          const data = typeof result.research_data === 'string' 
            ? JSON.parse(result.research_data) 
            : result.research_data;
          
          let analyzedText = '';
          if (data?.research) analyzedText += data.research.slice(0, 200);
          if (data?.verified_points) analyzedText += ` Points: ${data.verified_points.length}`;
          
          console.log(`[Analytics Debug ${index}] Analyzed Text:`, analyzedText);
        }
        
        const current = industryMap.get(industry) || { count: 0, totalConfidence: 0 };
        industryMap.set(industry, { 
          count: current.count + 1, 
          totalConfidence: current.totalConfidence + confidence 
        });
        
        // Company size analysis
        const size = determineCompanySize(result.research_data);
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
      });
      
      // Process industry data
      const totalCompanies = contactResults.length;
      const industryAnalytics = Array.from(industryMap.entries())
        .map(([industry, data]) => ({
          industry: industry.length > 12 ? industry.substring(0, 12) + '...' : industry,
          companies: data.count,
          percentage: Math.round((data.count / totalCompanies) * 100),
          avgConfidence: Math.round(data.totalConfidence / data.count)
        }))
        .sort((a, b) => b.companies - a.companies)
        .slice(0, 8);
      
      console.log('[Analytics Debug] Final Industry Distribution:', industryAnalytics);
      console.log('[Analytics Debug] Industry Map:', Array.from(industryMap.entries()));
      
      // Process company size data
      const sizeAnalytics = Array.from(sizeMap.entries())
        .map(([size, count]) => ({
          size,
          count,
          percentage: Math.round((count / totalCompanies) * 100)
        }))
        .sort((a, b) => b.count - a.count);
      
      // Process research trends (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });
      
      const trendData = last7Days.map(date => {
        const dayResults = contactResults.filter((r: any) => 
          r.created_at?.split('T')[0] === date
        );
        const highQuality = dayResults.filter((r: any) => 
          calculateConfidence(r) >= 70
        ).length;
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          searches: dayResults.length,
          highQuality
        };
      });
      
      setIndustryData(industryAnalytics);
      setCompanySizeData(sizeAnalytics);
      setResearchTrends(trendData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [extractIndustry, calculateConfidence, determineCompanySize]);

  useEffect(() => {
    loadAnalytics();

    const supabase = createClient();
    
    const contactChannel = supabase
      .channel('analytics_contact_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'contact_results' },
        () => setTimeout(loadAnalytics, 500)
      )
      .subscribe();

    return () => {
      contactChannel.unsubscribe();
    };
  }, [loadAnalytics]);

  const hasData = useMemo(() => 
    industryData.length > 0 || companySizeData.length > 0,
    [industryData, companySizeData]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-64 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-red-700 mb-2">Analytics Error</h3>
        <p className="text-red-500 mb-6">{error}</p>
        <button 
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="text-center py-16">
        <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Market Data Yet</h3>
        <p className="text-slate-500 mb-6">Start researching companies to see industry insights and market analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Industry Distribution & Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={industryData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="industry" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name) => [
                      `${value}${name === 'companies' ? ' companies' : '% confidence'}`,
                      name === 'companies' ? 'Companies' : 'Avg Confidence'
                    ]}
                  />
                  <Bar dataKey="companies" fill="#3B82F6" name="companies" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="avgConfidence" fill="#10B981" name="avgConfidence" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Company Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Company Size Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={companySizeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {companySizeData.map((entry, index) => {
                      const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
                      return (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value) => [`${value} companies`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              {companySizeData.map((entry, index) => {
                const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
                return (
                  <div key={entry.size} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="truncate">{entry.size}: {entry.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Research Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Research Trends & Quality (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <LineChart data={researchTrends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value, name) => [
                    `${value} ${name === 'searches' ? 'searches' : 'high-quality'}`,
                    name === 'searches' ? 'Total Searches' : 'High Quality (70%+)'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="searches" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  name="searches"
                />
                <Line 
                  type="monotone" 
                  dataKey="highQuality" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  name="highQuality"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}