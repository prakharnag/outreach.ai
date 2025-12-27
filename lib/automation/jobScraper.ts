/**
 * Job Scraper Utility
 *
 * Uses Playwright for browser automation to:
 * - Extract job details from posting pages
 * - Detect application form fields
 * - Pre-fill application forms
 *
 * Safe, legal automation for job applications
 */

import { chromium, type Browser, type Page } from 'playwright';

// ============================================================================
// TYPES
// ============================================================================

export interface JobDetails {
  title: string;
  company: string;
  location?: string;
  description?: string;
  requirements?: string[];
  url: string;
  applicationUrl?: string;
}

export interface FormField {
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'file' | 'checkbox' | 'radio';
  name: string;
  label?: string;
  selector: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select/radio fields
}

export interface DetectedForm {
  url: string;
  fields: FormField[];
  submitButton?: string;
  formSelector?: string;
}

export interface PrefilledForm {
  url: string;
  fields: Record<string, any>; // field name → value
  screenshot?: string; // Base64 screenshot
}

// ============================================================================
// JOB SCRAPER CLASS
// ============================================================================

export class JobScraper {
  private browser: Browser | null = null;

  /**
   * Initialize browser
   */
  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true, // Run in background
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract job details from a job posting URL
   */
  async extractJobDetails(url: string): Promise<JobDetails> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Extract job details using common selectors
      const details = await page.evaluate(() => {
        // Common selectors for job postings
        const titleSelectors = [
          'h1',
          '[class*="job-title"]',
          '[class*="posting-title"]',
          '[data-qa="job-title"]',
        ];

        const companySelectors = [
          '[class*="company-name"]',
          '[data-qa="company-name"]',
          'meta[property="og:site_name"]',
        ];

        const locationSelectors = [
          '[class*="location"]',
          '[data-qa="location"]',
        ];

        const descriptionSelectors = [
          '[class*="description"]',
          '[class*="job-description"]',
          '#job-description',
        ];

        const applyButtonSelectors = [
          'a[href*="apply"]',
          'button:has-text("Apply")',
          '[class*="apply-button"]',
        ];

        // Helper to get text from first matching selector
        const getTextFromSelectors = (selectors: string[]): string => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              return element.textContent?.trim() || '';
            }
          }
          return '';
        };

        // Helper to get attribute from first matching selector
        const getAttrFromSelectors = (selectors: string[], attr: string): string => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.hasAttribute(attr)) {
              return element.getAttribute(attr) || '';
            }
          }
          return '';
        };

        return {
          title: getTextFromSelectors(titleSelectors),
          company: getTextFromSelectors(companySelectors),
          location: getTextFromSelectors(locationSelectors),
          description: getTextFromSelectors(descriptionSelectors),
          applicationUrl: getAttrFromSelectors(applyButtonSelectors, 'href'),
        };
      });

      await page.close();

      return {
        ...details,
        url,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Detect form fields on an application page
   */
  async detectFormFields(url: string): Promise<DetectedForm> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Detect form fields
      const fields = await page.evaluate(() => {
        const detectedFields: FormField[] = [];

        // Find all input fields
        const inputs = document.querySelectorAll('input, textarea, select');

        inputs.forEach((input) => {
          const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

          // Skip hidden and submit buttons
          if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
            return;
          }

          // Get label
          let label = '';
          const labelElement = document.querySelector(`label[for="${element.id}"]`);
          if (labelElement) {
            label = labelElement.textContent?.trim() || '';
          } else if (element.hasAttribute('aria-label')) {
            label = element.getAttribute('aria-label') || '';
          } else if (element.hasAttribute('placeholder')) {
            label = element.getAttribute('placeholder') || '';
          }

          // Get selector (prefer ID, fallback to name)
          const selector = element.id
            ? `#${element.id}`
            : element.name
            ? `[name="${element.name}"]`
            : '';

          if (!selector) return;

          const field: FormField = {
            type: element.type as any,
            name: element.name || element.id || '',
            label,
            selector,
            required: element.hasAttribute('required'),
            placeholder: element.getAttribute('placeholder') || undefined,
          };

          // For select fields, get options
          if (element.tagName === 'SELECT') {
            const selectElement = element as HTMLSelectElement;
            field.options = Array.from(selectElement.options).map((opt) => opt.value);
          }

          detectedFields.push(field);
        });

        return detectedFields;
      });

      // Find submit button
      const submitButton = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        if (buttons.length > 0) {
          const button = buttons[0] as HTMLElement;
          return button.id
            ? `#${button.id}`
            : button.className
            ? `.${button.className.split(' ')[0]}`
            : 'button[type="submit"]';
        }
        return undefined;
      });

      await page.close();

      return {
        url,
        fields,
        submitButton,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Pre-fill form fields with user data (DOES NOT SUBMIT)
   */
  async prefillForm(
    url: string,
    formData: Record<string, any>
  ): Promise<PrefilledForm> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });

      // Fill form fields
      for (const [fieldName, value] of Object.entries(formData)) {
        try {
          // Try by name first
          const selector = `[name="${fieldName}"], #${fieldName}`;
          const element = await page.$(selector);

          if (element) {
            const tagName = await element.evaluate((el) => el.tagName);

            if (tagName === 'SELECT') {
              await page.selectOption(selector, value);
            } else if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
              const inputType = await element.evaluate((el) =>
                (el as HTMLInputElement).type
              );

              if (inputType === 'checkbox' || inputType === 'radio') {
                if (value) {
                  await page.check(selector);
                }
              } else if (inputType === 'file') {
                // Skip file uploads in pre-fill (handled separately)
                continue;
              } else {
                await page.fill(selector, String(value));
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fill field ${fieldName}:`, error);
          // Continue with other fields
        }
      }

      // Take screenshot
      const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });

      await page.close();

      return {
        url,
        fields: formData,
        screenshot,
      };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Submit a pre-filled form (use with caution - Phase 2)
   * Currently not implemented for safety
   */
  async submitForm(url: string, submitButtonSelector: string): Promise<boolean> {
    throw new Error('Auto-submit not implemented in Phase 1 (manual review required)');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create job scraper instance
 */
export async function createJobScraper(): Promise<JobScraper> {
  const scraper = new JobScraper();
  await scraper.init();
  return scraper;
}

/**
 * Extract job details with error handling
 */
export async function extractJobSafe(url: string): Promise<JobDetails | null> {
  const scraper = await createJobScraper();

  try {
    const details = await scraper.extractJobDetails(url);
    return details;
  } catch (error) {
    console.error('[extractJobSafe] Error:', error);
    return null;
  } finally {
    await scraper.close();
  }
}

/**
 * Map resume data to common form fields
 */
export function mapResumeToFormFields(resumeContent: string): Record<string, string> {
  // TODO: Use AI to extract structured data from resume
  // For now, return common field mappings

  return {
    // Common fields (will be enhanced with AI extraction)
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: resumeContent.substring(0, 500), // First 500 chars as summary
  };
}

/**
 * Detect ATS type from URL or page content
 */
export function detectATSType(url: string): string {
  const atsPatterns = {
    greenhouse: /greenhouse\.io/,
    lever: /lever\.co/,
    workday: /myworkdayjobs\.com/,
    taleo: /taleo\.net/,
    smartrecruiters: /smartrecruiters\.com/,
    jobvite: /jobvite\.com/,
    icims: /icims\.com/,
  };

  for (const [ats, pattern] of Object.entries(atsPatterns)) {
    if (pattern.test(url)) {
      return ats;
    }
  }

  return 'unknown';
}
