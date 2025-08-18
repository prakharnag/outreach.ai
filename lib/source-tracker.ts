import { createClient } from '@supabase/supabase-js';

export interface SourceMetrics {
  uniqueSourceCount: number;
  sourceUrls: string[];
  sourceTypes: { [key: string]: number };
}

export class SourceTracker {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  extractSourcesFromContent(content: string): SourceMetrics {
    const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const sources = new Set<string>();
    const sourceTypes: { [key: string]: number } = {};
    
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[2];
      sources.add(url);
      
      // Categorize source types
      const domain = this.extractDomain(url);
      const sourceType = this.categorizeSource(domain);
      sourceTypes[sourceType] = (sourceTypes[sourceType] || 0) + 1;
    }

    return {
      uniqueSourceCount: sources.size,
      sourceUrls: Array.from(sources),
      sourceTypes
    };
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private categorizeSource(domain: string): string {
    const categories = {
      'Official': ['company.com', 'corp.com', 'inc.com'],
      'News': ['techcrunch.com', 'businesswire.com', 'forbes.com', 'reuters.com'],
      'Professional': ['linkedin.com', 'crunchbase.com'],
      'Financial': ['sec.gov', 'bloomberg.com', 'yahoo.com'],
      'Social': ['twitter.com', 'facebook.com', 'instagram.com'],
      'Other': []
    };

    for (const [category, domains] of Object.entries(categories)) {
      if (domains.some(d => domain.includes(d.replace('.com', '')))) {
        return category;
      }
    }

    // Check for common patterns
    if (domain.includes('blog') || domain.includes('news')) return 'News';
    if (domain.includes('gov')) return 'Government';
    if (domain.includes('edu')) return 'Academic';
    
    return 'Other';
  }

  async saveSourceMetrics(userId: string, companyName: string, metrics: SourceMetrics): Promise<void> {
    try {
      await this.supabase
        .from('contact_results')
        .update({
          source_metrics: {
            unique_source_count: metrics.uniqueSourceCount,
            source_urls: metrics.sourceUrls,
            source_types: metrics.sourceTypes,
            tracked_at: new Date().toISOString()
          }
        })
        .eq('user_id', userId)
        .eq('company_name', companyName);
    } catch (error) {
      // Fail silently
    }
  }

  async getAggregatedMetrics(userId: string): Promise<{
    totalSources: number;
    avgSourcesPerCompany: number;
    sourceTypeDistribution: { [key: string]: number };
  }> {
    try {
      const { data } = await this.supabase
        .from('contact_results')
        .select('source_metrics')
        .eq('user_id', userId)
        .not('source_metrics', 'is', null);

      if (!data || data.length === 0) {
        return { totalSources: 0, avgSourcesPerCompany: 0, sourceTypeDistribution: {} };
      }

      let totalSources = 0;
      const allSourceTypes: { [key: string]: number } = {};

      data.forEach((record: any) => {
        const metrics = record.source_metrics;
        if (metrics?.unique_source_count) {
          totalSources += metrics.unique_source_count;
        }
        if (metrics?.source_types) {
          Object.entries(metrics.source_types).forEach(([type, count]) => {
            allSourceTypes[type] = (allSourceTypes[type] || 0) + (count as number);
          });
        }
      });

      return {
        totalSources,
        avgSourcesPerCompany: Math.round((totalSources / data.length) * 10) / 10,
        sourceTypeDistribution: allSourceTypes
      };
    } catch (error) {
      return { totalSources: 0, avgSourcesPerCompany: 0, sourceTypeDistribution: {} };
    }
  }
}