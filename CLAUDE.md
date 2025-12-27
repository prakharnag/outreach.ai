# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build production bundle
npm start            # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test                      # Run Jest unit tests
npm run test:watch            # Run tests in watch mode
npm run test:coverage         # Generate coverage report
npm run test:integration      # Run Playwright integration tests
npm run test:integration:ui   # Run Playwright with UI
npm run test:integration:headed  # Run Playwright in headed mode
npm run test:all              # Run all tests (unit + integration)
npm run test:ci               # Run tests with GitHub reporter for CI
```

### Database
```bash
npx supabase start           # Start local Supabase instance
npx supabase db push         # Push migrations to database
npm run drizzle:generate     # Generate Drizzle ORM schema
npm run drizzle:push         # Push Drizzle schema to database
```

## Architecture Overview

### Multi-Agent AI Pipeline

The core of this application is a **three-stage AI agent pipeline** that processes company research and generates personalized outreach messages:

1. **Research Agent** (`lib/researchAgent.ts`)
   - Uses Perplexity AI's Sonar model for real-time web research
   - Gathers company information, funding, tech stack, recent news
   - **Always identifies TWO contacts**: primary (hiring-related) and secondary (leadership)
   - Returns structured JSON with company overview, business points, and contact information
   - Prioritizes information from last 12-18 months from trusted sources

2. **Verifier Agent** (`lib/verifyAgent.ts`)
   - Uses Groq API with llama-3.3-70b-versatile model
   - Fact-checks research claims and validates sources
   - Removes irrelevant or stale information
   - Calculates confidence scores based on data quality
   - Preserves rich contact information structure

3. **Messaging Agent** (`lib/messagingAgent.ts`)
   - Uses Groq API to generate personalized messages
   - Creates two outputs:
     - **Cold Email**: 90-100 words with subject line, proper paragraph breaks
     - **LinkedIn Message**: Exactly 44 words, conversational
   - Supports 6 different writing tones (formal, casual, friendly, intellectual, confident, conversational)
   - Applies tone-specific system prompts and examples from `lib/tones.ts`
   - Includes extensive JSON guardrails and content validation

### Orchestration Flow

**Main Orchestrator** (`lib/langchain-orchestrator.ts` - `OutreachOrchestrator` class):
- Coordinates all three agents sequentially
- Handles Supabase persistence at each step
- Manages contact record creation and updates
- Implements step callbacks for real-time status updates
- Uses service role key for RLS bypass on server-side

**Chain Wrapper** (`lib/chain.ts` - `runChain` function):
- Provides 7-day caching layer for same company/role searches
- Maps orchestrator steps to user-facing status updates
- Handles streaming callbacks for real-time UI updates
- Fire-and-forget persistence to `outreach_runs` table

**API Endpoint** (`app/api/run/route.ts`):
- Edge runtime for global low-latency deployment
- Streams results as NDJSON (Newline-Delimited JSON)
- Integrates rate limiting (15 searches/day per user)
- Requires authentication via Supabase Auth

### Database Architecture

**Core Tables**:
- `contact_results` - Stores full research pipeline results with contacts and confidence scores
- `email_history` - Email message history grouped by company
- `linkedin_history` - LinkedIn message history grouped by company
- `outreach_runs` - Cache table for 7-day result reuse
- `user_profiles` - User metadata and resume storage references
- `user_rate_limits` - Universal rate limiting with sliding windows

**Resume Storage**:
- Resumes stored in Supabase Storage bucket: `resumes`
- Supports PDF and DOCX formats
- Original filename preserved in `user_profiles.resume_original_filename`
- File parsing handled by `lib/resumeUtils.ts` (pdf-parse, mammoth, pdfjs-dist)

**Rate Limiting** (`lib/universalRateLimiter.ts`):
- Simple universal limits (no user tiers)
- Daily limits: 15 searches, 5 LinkedIn rephrases, 5 email regenerations
- Implemented via database functions: `increment_rate_limit`, `get_rate_limit_status`
- Tracks usage with 24-hour sliding windows

### Key Design Patterns

**Contact Information Structure**:
```typescript
// New two-contact structure (preferred)
contact_information: {
  primary_contact: { name, title, email?, inferred?, confidence_score?, contact_type: 'hiring' | 'leadership' },
  secondary_contact: { name, title, email?, inferred?, confidence_score?, contact_type: 'hiring' | 'leadership' }
}

// Legacy single contact (still supported)
contact: { name, title, email?, inferred?, source? }
```

**Data Normalization Flow**:
- Research agent returns rich structured data
- Orchestrator normalizes it before passing to verifier
- Verifier output is merged back with original research data
- Messaging agent receives merged data with all context preserved

**Email Formatting Rules**:
- Subject line must be first line starting with "Subject: "
- Use `\n\n` for paragraph breaks in JSON strings (not single `\n`)
- Maintain proper email structure with clear paragraph separation
- Avoid writing as one continuous paragraph
- Example: `"Subject: Title\n\nDear Name,\n\nParagraph 1\n\nParagraph 2\n\nBest regards"`

### Critical Implementation Notes

**AI Model Configuration**:
- Primary model: `llama-3.3-70b-versatile` (Groq)
- Research model: `sonar` (Perplexity)
- All model references centralized in `lib/api.ts`
- Automatic fallback handling for deprecated models

**Resume Integration**:
- Resume content extracted via `lib/resumeUtils.ts`
- Passed to messaging agent for personalization when enabled
- User controls whether to use resume via `useResumeInPersonalization` flag
- Resume URLs have expiration - automatic recovery via `lib/resumeUtils.ts:refreshResumeUrl()`

**Tone Synchronization**:
- Tone must be consistent between search panel and output
- Tone configs in `lib/tones.ts` include system prompts and examples
- Rephrasing functions: `rephraseEmailWithTone()`, `rephraseLinkedInWithTone()`
- Each tone has specific style examples for email and LinkedIn

**Message Validation Guardrails**:
- `cleanJsonArtifacts()` - Removes JSON formatting from message content
- `validateLinkedInMessage()` - Ensures proper greeting and length (20-80 words)
- `validateEmailMessage()` - Ensures subject line, proper structure, paragraph breaks
- Fallback generators when AI output is invalid

**Streaming and Real-time Updates**:
- API uses NDJSON streaming for real-time status updates
- Event types: `status`, `intermediate`, `final`, `error`
- Client components parse stream and update UI progressively
- Callbacks: `onStepStart`, `onStepComplete`, `onError`

### Environment Variables

Required for development:
```bash
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anonymous key (client-side)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role key (server-side, bypasses RLS)
GROQ_API_KEY                       # Groq API key for LLM inference
PERPLEXITY_API_KEY                 # Perplexity AI API key for research
DATABASE_URL                       # Optional: Direct database connection string
```

### Component Architecture

**Main Dashboard** (`components/ui/dashboard.tsx`):
- Primary user interface with search panel and results
- Manages tone selection, resume upload toggle
- Handles search submission and result streaming
- Coordinates between input and output components

**Resume Management**:
- `components/ui/resume-upload.tsx` - File upload widget
- `components/ui/resume-viewer.tsx` - Resume display and management
- `lib/resumeUtils.ts` - File parsing and URL refresh utilities

**Output Display**:
- `components/ui/research-output.tsx` - Displays research, contacts, messages
- Independent regenerate buttons for email/LinkedIn
- Copy to clipboard functionality
- Source attribution with clickable links

**Rate Limiting UI**:
- `components/ui/rate-limit-status.tsx` - Display current usage
- `app/api/rate-limit-status/route.ts` - Fetch rate limit status
- Real-time updates when limits are reached

### Testing Strategy

**Unit Tests** (Jest):
- Test utilities and helper functions
- Mock external API calls
- Focus on business logic in `lib/` directory

**Integration Tests** (Playwright):
- End-to-end user flows
- Authentication and authorization
- API endpoint behavior
- Database interactions

**Test Files Location**:
- Unit tests: `__tests__/` or adjacent to source files
- Integration tests: `tests/` or `e2e/`
- Playwright config: `playwright.config.ts`

## Common Workflows

### Adding a New Writing Tone

1. Add tone type to `WritingTone` union in `lib/tones.ts`
2. Create `ToneConfig` object with:
   - `id`, `label`, `description`
   - `systemPrompt` for AI guidance
   - `exampleLinkedIn` and `exampleEmail` for style reference
3. Add to `WRITING_TONES` array
4. Tone selector (`components/ui/tone-selector.tsx`) will auto-update

### Modifying AI Agent Behavior

1. **Research Agent**: Edit system prompt in `lib/researchAgent.ts`
   - Adjust contact discovery strategy
   - Modify source prioritization rules
   - Update JSON output structure

2. **Verifier Agent**: Edit system prompt in `lib/verifyAgent.ts`
   - Change verification criteria
   - Adjust confidence scoring in `calculateConfidence()`

3. **Messaging Agent**: Edit system prompt in `lib/messagingAgent.ts`
   - Modify message length requirements
   - Update greeting and structure rules
   - Adjust guardrail validation functions

### Adding Database Migrations

1. Create new migration file: `supabase/migrations/###_description.sql`
2. Use incremental numbering (e.g., 024, 025)
3. Include RLS policies for user data security
4. Test locally: `npx supabase db reset` then `npx supabase db push`
5. Deploy: Migrations auto-run on Vercel deployment

### Extending Rate Limits

1. Add new action type to `RateLimitAction` in `lib/universalRateLimiter.ts`
2. Define limit in `RATE_LIMITS` object
3. Add to `getRateLimitConfig()` with description
4. Apply rate limit check in relevant API route
5. Update database function if needed (migration 019, 020, 022)

## Debugging Tips

### Agent Pipeline Issues

- Check `console.log` in orchestrator callbacks for step-by-step progress
- Verify API keys in environment variables
- Check Groq/Perplexity API status and rate limits
- Review model availability (deprecated models fail silently)

### Database Issues

- Verify RLS policies don't block service role operations
- Check `currentRecordId` is set correctly in orchestrator
- Use service role key for server-side operations
- Review Supabase logs for constraint violations

### Message Generation Issues

- Check AI output before JSON parsing in `messagingAgent.ts`
- Verify guardrail functions aren't over-sanitizing
- Review tone config prompts and examples
- Check for proper contact name extraction

### Resume Issues

- Verify file is in supported format (PDF, DOCX)
- Check Storage bucket policies and permissions
- Test URL expiration and refresh logic
- Review parsing errors in `resumeUtils.ts`

## Performance Considerations

- **Caching**: 7-day cache prevents duplicate research (check `outreach_runs` table)
- **Edge Runtime**: All API routes use Edge for global deployment
- **Streaming**: NDJSON streaming provides real-time feedback without blocking
- **Rate Limiting**: Prevents API cost overruns and abuse
- **Database Indexes**: Optimized queries on `user_id`, `company_name`, `created_at`

## Security Notes

- All user data protected by Row Level Security (RLS)
- Service role key only used server-side for orchestrator
- Resume files stored with user-scoped access policies
- Rate limiting prevents abuse and cost escalation
- Authentication required for all main API endpoints
