import { z } from "zod";

/**
 * Unified Contact Schema - Single Source of Truth
 *
 * This schema replaces 3 different contact formats that previously existed:
 * 1. Legacy single contact: { name, title, email, inferred }
 * 2. New dual contact (nested): { primary_contact, secondary_contact }
 * 3. Research output contact_information structure
 *
 * The unified schema enforces:
 * - TWO contacts always (primary + secondary)
 * - Primary contact: hiring-related role (recruiter, talent acquisition, HR)
 * - Secondary contact: leadership role (CEO, CTO, engineering lead)
 * - Consistent structure across all agents and API endpoints
 */

const ContactPersonSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  title: z.string().min(1, "Contact title is required"),
  email: z.string().email().optional(),
  inferred: z.boolean().default(false).describe("Whether email was inferred vs found publicly"),
  confidence_score: z.number().min(0).max(1).describe("Confidence in contact accuracy (0-1)"),
  contact_type: z.enum(["hiring", "leadership"]).describe("Type of contact"),
  source: z.object({
    title: z.string(),
    url: z.string().url()
  }).optional().describe("Source where contact was found")
});

export const ContactSchema = z.object({
  primary_contact: ContactPersonSchema.extend({
    contact_type: z.literal("hiring")
  }).describe("Primary hiring contact (recruiter, talent acquisition, HR)"),
  secondary_contact: ContactPersonSchema.extend({
    contact_type: z.literal("leadership")
  }).describe("Secondary leadership contact (CEO, CTO, department head)")
});

export type Contact = z.infer<typeof ContactSchema>;
export type ContactPerson = z.infer<typeof ContactPersonSchema>;

/**
 * Normalize legacy contact formats to unified schema
 *
 * Handles:
 * - Single contact format → converts to dual contact
 * - Already unified format → validates and returns as-is
 * - Missing or invalid data → creates placeholder contacts
 */
export function normalizeLegacyContact(legacy: any): Contact {
  // Already in unified format
  if (legacy?.primary_contact && legacy?.secondary_contact) {
    try {
      return ContactSchema.parse(legacy);
    } catch (error) {
      console.warn("Invalid unified contact format, creating placeholders:", error);
    }
  }

  // Legacy single contact format
  if (legacy?.name || legacy?.title) {
    return {
      primary_contact: {
        name: legacy.name || "N/A",
        title: legacy.title || "N/A",
        email: legacy.email,
        inferred: legacy.inferred || false,
        confidence_score: legacy.confidence_score || 0.5,
        contact_type: "hiring" as const,
        source: legacy.source ? {
          title: legacy.source.title || "Unknown Source",
          url: legacy.source.url || legacy.source
        } : undefined
      },
      secondary_contact: {
        name: "N/A",
        title: "N/A",
        confidence_score: 0.0,
        contact_type: "leadership" as const,
        inferred: false
      }
    };
  }

  // No contact data available - return placeholders
  return {
    primary_contact: {
      name: "N/A",
      title: "N/A",
      confidence_score: 0.0,
      contact_type: "hiring" as const,
      inferred: false
    },
    secondary_contact: {
      name: "N/A",
      title: "N/A",
      confidence_score: 0.0,
      contact_type: "leadership" as const,
      inferred: false
    }
  };
}

/**
 * Validate contact data
 * Returns true if contact has meaningful data (not placeholders)
 */
export function isValidContact(contact: Contact): boolean {
  const primaryValid = contact.primary_contact.name !== "N/A" &&
                      contact.primary_contact.title !== "N/A";
  const secondaryValid = contact.secondary_contact.name !== "N/A" &&
                        contact.secondary_contact.title !== "N/A";

  return primaryValid || secondaryValid;
}

/**
 * Get best available contact (prefer primary, fallback to secondary)
 */
export function getBestContact(contact: Contact): ContactPerson {
  if (contact.primary_contact.name !== "N/A" && contact.primary_contact.title !== "N/A") {
    return contact.primary_contact;
  }
  return contact.secondary_contact;
}

/**
 * Get contact name for message greeting
 * Returns primary contact name if available, else secondary, else generic greeting
 */
export function getContactNameForGreeting(contact: Contact | undefined): string {
  if (!contact) return "there";

  if (contact.primary_contact.name !== "N/A") {
    return contact.primary_contact.name;
  }

  if (contact.secondary_contact.name !== "N/A") {
    return contact.secondary_contact.name;
  }

  return "there";
}
