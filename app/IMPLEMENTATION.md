```markdown
# Outreach Automation: Industry Best Practices Documentation (2025)

## Overview

End-to-end automation for company contact discovery, personalized cold email/message generation, and multi-channel outreach—all triggered by one action.

- **Stack**: Next.js, Supabase, Langchain, Perplexity API/Groq
- **Integrations**: Apollo (data), SendGrid (email), Dripify (LinkedIn), Supabase (data store)

---

## 1. User Input & Contact Discovery

**UI/UX**
- Allow CSV upload or in-browser form for companies/roles.

**Contact Discovery**
- **Apollo.io API** for company/role-based contact enrichment (reliable data, generous free tier for startups).
- Store parsed company/role input and fetched contacts in Supabase for all processing steps.

**Example (TS Interface):**
```
interface EnrichedContact {
  company: string;
  role?: string;
  fullName: string;
  email: string;
  linkedin: string;
  apolloId: string;
}
```

**Notes**
- Apollo is industry standard for B2B contact data, with a noted startup program/free tier.

---

## 2. Message Generation (AI-Powered, Personalized)

- Fetch contacts/company info from Supabase.
- Pipe through Langchain workflow calling PerplexityAPI+Groq.
- Generate custom cold emails AND LinkedIn messages for each contact.
- Store output (`messages` table) per contact for audit/review and deduplication.

**Core Function:**
```
async function generateMessages(contact: EnrichedContact) {
  // Use Langchain/LLM for template -> personalized cold email, LinkedIn message
}
```

---```markdown
# Outreach Automation: Industry Best Practices Documentation (2025)

## Overview

End-to-end automation for company contact discovery, personalized cold email/message generation, and multi-channel outreach—all triggered by one action.

- **Stack**: Next.js, Supabase, Langchain, Perplexity API/Groq
- **Integrations**: Apollo (data), SendGrid (email), Dripify (LinkedIn), Supabase (data store)

---

## 1. User Input & Contact Discovery

**UI/UX**
- Allow CSV upload or in-browser form for companies/roles.

**Contact Discovery**
- **Apollo.io API** for company/role-based contact enrichment (reliable data, generous free tier for startups).
- Store parsed company/role input and fetched contacts in Supabase for all processing steps.

**Example (TS Interface):**
```
interface EnrichedContact {
  company: string;
  role?: string;
  fullName: string;
  email: string;
  linkedin: string;
  apolloId: string;
}
```

**Notes**
- Apollo is industry standard for B2B contact data, with a noted startup program/free tier.

---

## 2. Message Generation (AI-Powered, Personalized)

- Fetch contacts/company info from Supabase.
- Pipe through Langchain workflow calling PerplexityAPI+Groq.
- Generate custom cold emails AND LinkedIn messages for each contact.
- Store output (`messages` table) per contact for audit/review and deduplication.

**Core Function:**
```
async function generateMessages(contact: EnrichedContact) {
  // Use Langchain/LLM for template -> personalized cold email, LinkedIn message
}
```

---

## 2A. User-Defined Message Templates (New Feature)

**Goal:**  
Allow users to write, save, and select custom templates for LinkedIn messages and emails before outreach. Users can pick a template per campaign, and these are used by the LLM workflow for personalization.

### Implementation Steps

**1. Template Creation UI**  
- Add UI components for users to:
  - Create a new LinkedIn message template
  - Create a new email template
  - Save/edit/delete templates
- Use Supabase (or similar) to store templates by user.

**Example (TS Interface):**
```
interface MessageTemplate {
  id: string;
  type: 'email' | 'linkedin';
  userId: string;
  name: string;
  body: string; // Supports variables (e.g., {{fullName}}, {{company}})
  createdAt: Date;
}
```

**2. Template Selection Before Search/Send**
- Add a step in the workflow where the user selects:
  - One email template
  - One LinkedIn template
- UI: Dropdown/select menu listing all user’s saved templates.

**3. Template Integration with LLM**  
- When generating messages:
  - Insert the user-selected template as a prompt/base for the LLM workflow.
  - Replace variables in the template (e.g., `{{fullName}}`) with LLM or system data.

**Example Usage:**
```
const personalizedEmail = fillTemplate(selectedEmailTemplate.body, contactData);
const personalizedLinkedInMsg = fillTemplate(selectedLinkedInTemplate.body, contactData);
// Optionally pass through LLM for enhancement
```

**4. Data Model Updates**
- Add a `message_templates` table (Supabase) with relevant fields.
- Reference the selected template IDs in each outreach “campaign” or batch.

**5. UX Flow Update**

1. User uploads companies/roles.
2. User optionally creates/edits/selects message templates (step before run).
3. User reviews template previews if desired.
4. System generates personalized outputs based on the user’s chosen templates.
5. User reviews & sends.

---

## 3. Bulk Email Sending

- **SendGrid** is the industry leader for SaaS email with a robust free tier (100 emails/day) and strong Node/TS SDK.
- Integrate with Next.js API route, serverless function, or queue for reliable, scalable email delivery.

**Workflow**
- Fetch all unsent messages for selected batch from Supabase.
- Pipe each to SendGrid API for delivery; log status/postback (sent, failed, etc.) in Supabase.

**Best Practice**
- Use personalized sender addresses (your domain or single verified sender).
- Handle bounces and unsubscribes via SendGrid webhooks.

---

## 4. Automated LinkedIn Messaging

- **Dripify**: Industry-respected for automation and anti-ban protection, with a free plan for small batches and solid long-term value.
- Use Dripify’s batch messaging features: upload contacts (LinkedIn URLs from Apollo), trigger connection/message sequence.
- Manually import/export as fallback if direct API integration is limited (Dripify API/private endpoints evolve yearly).

> **Note:** LinkedIn messaging automation carries risk—Dripify’s “safe mode” is most compliant in 2025, but always inform users and respect LinkedIn’s user agreement.

---

## 5. Storage, Review, and Status

- Store all contact, message, send-status, and outreach history in Supabase.
- Provide a “Review & Send” interface for user QA and compliance.
- Show batch status (pending, sent, failed) and allow retry/export.

---

## 6. Orchestration & Background Processing

- Offload batch processes (enrichment, messaging, sending) to Next.js API routes, queue, or serverless background workers.
- Use webhooks or polling for send-status updates.
- UI notifies users of success/failure, step-by-step result logs.

---

## 7. Security & Compliance

- Protect API keys with environment variables.
- Log every action for GDPR/CAN-SPAM/audit.
- Provide user opt-out and clear unsubscribe flows.
- Use domains and sender addresses with proper SPF/DKIM/DMARC for email deliverability.

---

## 8. Testing Checklist

- [ ] Validate Apollo contact enrichment for multiple industries/sample data.
- [ ] Check LLM/prompt accuracy and edge cases for message generation.
- [ ] Run SendGrid sends in sandbox mode and check deliverability.
- [ ] Simulate Dripify automation with safe mode enabled and limited batches.
- [ ] Verify all UI/UX flows from file upload to sent/tracking.
- [ ] Test template creation/editing/selection and variable filling in generated messages.

---

## Directory Structure Example

```
/components/UploadCompanies.tsx
/components/ReviewAndSend.tsx
/components/TemplateEditor.tsx     // View, create, edit templates
/components/TemplateSelector.tsx  // Select template before campaign
/pages/api/enrichContacts.ts
/pages/api/generateMessages.ts
/pages/api/sendBatchEmails.ts
/pages/api/sendLinkedInBatch.ts
/lib/apolloApi.ts
/lib/sendgridClient.ts
/lib/dripifyIntegration.ts
/lib/templateUtils.ts             // Template variable parsing/filling
/supabase/tables.sql
/supabase/message_templates.sql
```

---

**References**
- Apollo.io Startup/Free API
- Langchain + Perplexity API/Groq
- SendGrid Node.js SDK, free tier
- Dripify docs, safe automation
- Supabase

---

**Copy this documentation into your Copilot/Cursor or dev docs. For code or integration samples, ask for any section in detail!**
```

[1](https://www.outreachgen.tech/)

## 3. Bulk Email Sending

- **SendGrid** is the industry leader for SaaS email with a robust free tier (100 emails/day) and strong Node/TS SDK.
- Integrate with Next.js API route, serverless function, or queue for reliable, scalable email delivery.

**Workflow**
- Fetch all unsent messages for selected batch from Supabase.
- Pipe each to SendGrid API for delivery; log status/postback (sent, failed, etc.) in Supabase.

**Best Practice**
- Use personalized sender addresses (your domain or single verified sender).
- Handle bounces and unsubscribes via SendGrid webhooks.

---

## 4. Automated LinkedIn Messaging

- **Dripify**: Industry-respected for automation and anti-ban protection, with a free plan for small batches and solid long-term value.
- Use Dripify’s batch messaging features: upload contacts (LinkedIn URLs from Apollo), trigger connection/message sequence.
- Manually import/export as fallback if direct API integration is limited (Dripify API/private endpoints evolve yearly).

> **Note:** LinkedIn messaging automation carries risk—Dripify’s “safe mode” is most compliant in 2025, but always inform users and respect LinkedIn’s user agreement.

---

## 5. Storage, Review, and Status

- Store all contact, message, send-status, and outreach history in Supabase.
- Provide a “Review & Send” interface for user QA and compliance.
- Show batch status (pending, sent, failed) and allow retry/export.

---

## 6. Orchestration & Background Processing

- Offload batch processes (enrichment, messaging, sending) to Next.js API routes, queue, or serverless background workers.
- Use webhooks or polling for send-status updates.
- UI notifies users of success/failure, step-by-step result logs.

---

## 7. Security & Compliance

- Protect API keys with environment variables.
- Log every action for GDPR/CAN-SPAM/audit.
- Provide user opt-out and clear unsubscribe flows.
- Use domains and sender addresses with proper SPF/DKIM/DMARC for email deliverability.

---

## 8. Testing Checklist

- [ ] Validate Apollo contact enrichment for multiple industries/sample data.
- [ ] Check LLM/prompt accuracy and edge cases for message generation.
- [ ] Run SendGrid sends in sandbox mode and check deliverability.
- [ ] Simulate Dripify automation with safe mode enabled and limited batches.
- [ ] Verify all UI/UX flows from file upload to sent/tracking.

---

## Directory Structure Example

```
/components/UploadCompanies.tsx
/components/ReviewAndSend.tsx
/pages/api/enrichContacts.ts
/pages/api/generateMessages.ts
/pages/api/sendBatchEmails.ts
/pages/api/sendLinkedInBatch.ts
/lib/apolloApi.ts
/lib/sendgridClient.ts
/lib/dripifyIntegration.ts
/supabase/tables.sql
```

---

**References**
- Apollo.io Startup/Free API
- Langchain + Perplexity API/Groq
- SendGrid Node.js SDK, free tier
- Dripify docs, safe automation
- Supabase

---

**Copy this documentation into your Copilot/Cursor or dev docs. For code or integration samples, ask for any section in detail!**
```

[1](https://www.outreachgen.tech/)