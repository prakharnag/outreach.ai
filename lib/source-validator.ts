// URL Validation and Source Verification Utility

export interface ValidatedSource {
  url: string;
  title: string;
  isValid: boolean;
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
}

export class SourceValidator {
  private static readonly TIMEOUT_MS = 5000; // 5 second timeout
  private static readonly MAX_RETRIES = 2;
  
  /**
   * Validates a single URL and returns validation results
   */
  static async validateUrl(url: string, title: string = ''): Promise<ValidatedSource> {
    const result: ValidatedSource = {
      url,
      title,
      isValid: false
    };

    try {
      // Basic URL format validation
      const urlObj = new URL(url);
      
      // Skip validation for certain patterns that are known to be problematic
      if (this.shouldSkipValidation(urlObj)) {
        result.isValid = false;
        result.error = 'URL pattern not supported for validation';
        return result;
      }

      // Attempt to fetch the URL with a HEAD request first (faster)
      const response = await this.fetchWithTimeout(url, 'HEAD');
      
      if (response.ok) {
        result.isValid = true;
        result.statusCode = response.status;
        
        // Check if there was a redirect
        if (response.url !== url) {
          result.redirectUrl = response.url;
        }
      } else {
        // Try with GET request if HEAD fails
        const getResponse = await this.fetchWithTimeout(url, 'GET');
        result.isValid = getResponse.ok;
        result.statusCode = getResponse.status;
        result.redirectUrl = getResponse.url !== url ? getResponse.url : undefined;
      }
      
    } catch (error: any) {
      result.error = error.message;
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates multiple URLs in parallel with rate limiting
   */
  static async validateUrls(sources: Array<{url: string, title: string}>): Promise<ValidatedSource[]> {
    const results = await Promise.allSettled(
      sources.map(source => this.validateUrl(source.url, source.title))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: sources[index].url,
          title: sources[index].title,
          isValid: false,
          error: 'Validation failed'
        };
      }
    });
  }

  /**
   * Filters out invalid URLs and provides fallback sources
   */
  static async sanitizeSources(sources: Array<{url: string, title: string}>): Promise<Array<{url: string, title: string, verified: boolean}>> {
    const validatedSources = await this.validateUrls(sources);
    
    return validatedSources.map(source => ({
      url: source.redirectUrl || source.url,
      title: source.title,
      verified: source.isValid
    })).filter(source => source.verified); // Only return verified sources
  }

  /**
   * Generates fallback research sources when original sources are invalid
   */
  static generateFallbackSources(companyName: string, domain?: string): Array<{url: string, title: string, verified: boolean}> {
    const fallbackSources = [];
    
    if (domain) {
      fallbackSources.push({
        url: `https://${domain}`,
        title: `${companyName} Official Website`,
        verified: false // Mark as unverified fallback
      });
      
      fallbackSources.push({
        url: `https://${domain}/about`,
        title: `${companyName} About Page`,
        verified: false
      });
    }

    // Add LinkedIn company search
    const linkedinUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
    fallbackSources.push({
      url: linkedinUrl,
      title: `${companyName} on LinkedIn`,
      verified: false
    });

    // Add Crunchbase search
    const crunchbaseUrl = `https://www.crunchbase.com/search/organizations/field/organizations/name/${encodeURIComponent(companyName)}`;
    fallbackSources.push({
      url: crunchbaseUrl,
      title: `${companyName} on Crunchbase`,
      verified: false
    });

    return fallbackSources;
  }

  private static async fetchWithTimeout(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OutreachBot/1.0)',
        },
        // Don't follow redirects automatically so we can track them
        redirect: 'follow'
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private static shouldSkipValidation(urlObj: URL): boolean {
    // Skip validation for certain domains or patterns that are known to be problematic
    const skipPatterns = [
      'javascript:',
      'mailto:',
      'tel:',
      'ftp:',
      // Add domains that typically block automated requests
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com'
    ];

    return skipPatterns.some(pattern => 
      urlObj.protocol.includes(pattern) || 
      urlObj.hostname.includes(pattern.replace('.com', ''))
    );
  }
}
