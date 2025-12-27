/**
 * Email Sender Utility
 *
 * Handles automated email sending via Gmail API (OAuth2)
 * Safe, legal email automation using user's Gmail account
 *
 * Features:
 * - Gmail OAuth2 authentication
 * - Email composition and sending
 * - Tracking (sent, delivered, opened)
 * - Rate limiting (respects Gmail limits)
 */

import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

// ============================================================================
// TYPES
// ============================================================================

export interface EmailConfig {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

// ============================================================================
// EMAIL SENDER CLASS
// ============================================================================

export class EmailSender {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Get Gmail OAuth authorization URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GmailTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as GmailTokens;
  }

  /**
   * Set OAuth tokens for authenticated requests
   */
  setTokens(tokens: GmailTokens): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(config: EmailConfig): Promise<EmailResult> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Create email message
      const message = this.createEmailMessage(config);

      // Send email
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error: any) {
      console.error('[EmailSender] Error sending email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Create RFC 2822 formatted email message
   */
  private createEmailMessage(config: EmailConfig): string {
    const { to, toName, subject, body, fromName } = config;

    const toHeader = toName ? `${toName} <${to}>` : to;
    const fromHeader = fromName ? `${fromName}` : '';

    const messageParts = [
      `To: ${toHeader}`,
      fromHeader ? `From: ${fromHeader}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].filter(Boolean);

    const message = messageParts.join('\r\n');

    // Base64url encode
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Validate tokens and refresh if needed
   */
  async validateAndRefreshTokens(): Promise<GmailTokens> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials as GmailTokens;
    } catch (error) {
      throw new Error('Failed to refresh access token. User needs to re-authenticate.');
    }
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(): Promise<{ email: string; name?: string }> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const response = await gmail.users.getProfile({ userId: 'me' });

      return {
        email: response.data.emailAddress || '',
      };
    } catch (error) {
      throw new Error('Failed to get Gmail profile');
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create email sender instance
 */
export function createEmailSender(): EmailSender {
  const clientId = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Gmail OAuth credentials not configured');
  }

  return new EmailSender(clientId, clientSecret, redirectUri);
}

/**
 * Send email with error handling and logging
 */
export async function sendEmailSafe(
  sender: EmailSender,
  config: EmailConfig,
  onProgress?: (status: string) => void
): Promise<EmailResult> {
  try {
    onProgress?.('Validating Gmail access...');

    // Validate and refresh tokens if needed
    await sender.validateAndRefreshTokens();

    onProgress?.('Sending email...');

    // Send email
    const result = await sender.sendEmail(config);

    if (result.success) {
      onProgress?.('Email sent successfully!');
    } else {
      onProgress?.(`Failed to send: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error('[sendEmailSafe] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Format email body with proper line breaks
 */
export function formatEmailBody(template: string, variables: Record<string, string>): string {
  let formatted = template;

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  // Ensure proper line breaks
  formatted = formatted.replace(/\n\n/g, '\r\n\r\n');
  formatted = formatted.replace(/\n/g, '\r\n');

  return formatted;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email sending is allowed (rate limiting)
 * Gmail free tier: 500 emails/day
 */
export function checkGmailRateLimit(emailsSentToday: number): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const dailyLimit = 500; // Gmail free tier limit
  const remaining = Math.max(0, dailyLimit - emailsSentToday);

  return {
    allowed: emailsSentToday < dailyLimit,
    remaining,
    limit: dailyLimit,
  };
}
