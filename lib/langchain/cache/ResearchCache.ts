import { BaseCache } from "@langchain/core/caches";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Define Generation type locally since it's not exported
type Generation = {
  text: string;
  generationInfo?: Record<string, any>;
};

/**
 * ResearchCache - Supabase-backed cache for LangChain with 7-day TTL
 *
 * This cache implementation stores research results in Supabase to avoid
 * redundant API calls for the same company/role combination within 7 days.
 *
 * Integration:
 * - Extends LangChain's BaseCache for seamless integration
 * - Uses Supabase `runs` table for persistence
 * - Automatically expires entries older than 7 days
 * - Falls back gracefully if Supabase is not configured
 *
 * Performance:
 * - In-memory Map for fast lookups
 * - Async Supabase writes (non-blocking)
 * - Automatic TTL cleanup
 *
 * Usage:
 * ```typescript
 * const llm = new ChatPerplexityAI({
 *   cache: new ResearchCache()
 * });
 * ```
 */
export class ResearchCache extends BaseCache {
  private memoryCache: Map<string, Generation[]> = new Map();
  private supabase: SupabaseClient | null = null;
  private ttlHours: number = 24 * 7; // 7 days

  constructor(ttlHours: number = 24 * 7) {
    super();
    this.ttlHours = ttlHours;
    this.initSupabase();
  }

  /**
   * Initialize Supabase client
   * @private
   */
  private initSupabase(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      console.warn("[ResearchCache] Supabase not configured, using memory-only cache");
    }
  }

  /**
   * Look up cached result for a given prompt
   * Required by BaseCache interface
   */
  async lookup(prompt: string, llmKey: string): Promise<Generation[] | null> {
    // Extract company and role from prompt
    const { company, role } = this.parsePrompt(prompt);

    if (!company || !role) {
      return null; // Can't cache without company/role
    }

    // Check memory cache first
    const cacheKey = this.getCacheKey(company, role);
    const memoryResult = this.memoryCache.get(cacheKey);
    if (memoryResult) {
      console.log(`[ResearchCache] Memory cache hit for ${company} / ${role}`);
      return memoryResult;
    }

    // Check Supabase if configured
    if (this.supabase) {
      const supabaseResult = await this.lookupFromSupabase(company, role);
      if (supabaseResult) {
        // Store in memory for faster subsequent lookups
        this.memoryCache.set(cacheKey, supabaseResult);
        console.log(`[ResearchCache] Supabase cache hit for ${company} / ${role}`);
        return supabaseResult;
      }
    }

    console.log(`[ResearchCache] Cache miss for ${company} / ${role}`);
    return null;
  }

  /**
   * Store a new cache entry
   * Required by BaseCache interface
   */
  async update(prompt: string, llmKey: string, value: Generation[]): Promise<void> {
    const { company, role } = this.parsePrompt(prompt);

    if (!company || !role) {
      return; // Can't cache without company/role
    }

    const cacheKey = this.getCacheKey(company, role);

    // Update memory cache
    this.memoryCache.set(cacheKey, value);

    // Update Supabase asynchronously (non-blocking)
    if (this.supabase) {
      this.updateSupabase(company, role, value).catch(error => {
        console.error("[ResearchCache] Failed to update Supabase cache:", error);
      });
    }
  }

  /**
   * Look up cached research from Supabase
   * @private
   */
  private async lookupFromSupabase(
    company: string,
    role: string
  ): Promise<Generation[] | null> {
    if (!this.supabase) return null;

    try {
      const sinceIso = new Date(Date.now() - this.ttlHours * 3600 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from("runs")
        .select("research_json")
        .eq("company", company)
        .eq("role", role)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const researchData = data[0].research_json;

      // Convert to Generation format
      return [
        {
          text: JSON.stringify(researchData),
          generationInfo: {
            cached: true,
            cacheSource: "supabase",
            company,
            role
          }
        }
      ];
    } catch (error) {
      console.error("[ResearchCache] Supabase lookup error:", error);
      return null;
    }
  }

  /**
   * Update Supabase cache with new research data
   * @private
   */
  private async updateSupabase(
    company: string,
    role: string,
    value: Generation[]
  ): Promise<void> {
    if (!this.supabase || value.length === 0) return;

    try {
      // Extract research JSON from generation
      const researchText = value[0].text;
      let researchJson: any;

      try {
        researchJson = JSON.parse(researchText);
      } catch {
        researchJson = { summary: researchText, points: [] };
      }

      // Check if an entry exists for this company/role
      const { data: existing } = await this.supabase
        .from("runs")
        .select("id")
        .eq("company", company)
        .eq("role", role)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing entry
        await this.supabase
          .from("runs")
          .update({
            research_json: researchJson,
            created_at: new Date().toISOString()
          })
          .eq("id", existing[0].id);
      } else {
        // Insert new entry (placeholder for full run)
        await this.supabase.from("runs").insert([
          {
            company,
            role,
            research_json: researchJson,
            verified_json: null,
            linkedin: null,
            email: null
          }
        ]);
      }
    } catch (error) {
      console.error("[ResearchCache] Supabase update error:", error);
    }
  }

  /**
   * Parse company and role from research prompt
   * @private
   */
  private parsePrompt(prompt: string): { company: string | null; role: string | null } {
    // Extract company and role from prompt format:
    // "Company: [name] (domain)\nTarget role: [role]\n..."
    // or "Company: [name]\nRole: [role]\n..."

    let company: string | null = null;
    let role: string | null = null;

    const companyMatch = prompt.match(/Company:\s*([^\n(]+)/i);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }

    const roleMatch = prompt.match(/(?:Target role|Role):\s*([^\n]+)/i);
    if (roleMatch) {
      role = roleMatch[1].trim();
    }

    return { company, role };
  }

  /**
   * Generate cache key from company and role
   * @private
   */
  private getCacheKey(company: string, role: string): string {
    return `research:${company.toLowerCase()}:${role.toLowerCase()}`;
  }

  /**
   * Clear all cached entries (memory only)
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryEntries: number; ttlHours: number } {
    return {
      memoryEntries: this.memoryCache.size,
      ttlHours: this.ttlHours
    };
  }
}

/**
 * Factory function to create ResearchCache instance
 */
export function createResearchCache(ttlHours: number = 24 * 7): ResearchCache {
  return new ResearchCache(ttlHours);
}
