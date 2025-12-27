# Outreach.ai

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.11-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> An intelligent cold outreach automation platform that combines AI-powered company research with personalized email and LinkedIn message generation.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Core Workflow](#core-workflow)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Known Issues](#known-issues)
- [Contributing](#contributing)
- [License](#license)

## Overview

Outreach.ai streamlines the entire outreach process from prospect research to message delivery. It uses a multi-agent AI system to gather company intelligence, verify information, identify key contacts, and generate personalized outreach messages.

## Key Features

### AI-Powered Research & Verification
- **Company Research** - Automated company discovery and analysis using Perplexity AI
- **Data Verification** - Fact-checking with confidence scoring for research accuracy
- **Contact Intelligence** - Executive identification and email inference
- **Source Tracking** - Real-time data collection from trusted sources with verification

### Personalized Message Generation
- **Email Generation** - AI-generated cold emails (90-100 words) with subject lines
- **LinkedIn Messages** - Conversational LinkedIn messages (44 words)
- **6 Writing Tones** - Formal, Casual & Friendly, Warm & Personal, Intellectual, Confident, Conversational
- **Resume Integration** - Upload resume for enhanced message personalization
- **Tone Synchronization** - Consistent tone across search panel and output

### Smart Features
- **Rate Limiting** - Universal rate limiting (15 searches/day, 5 rephrases/day)
- **Message Caching** - 7-day cache for same company/role searches
- **Independent Regeneration** - Regenerate email or LinkedIn messages separately
- **History Management** - Smart grouping by company with individual message deletion
- **Autocomplete** - Company search autocomplete with manual entry fallback

### Mobile-First Design
- Fully responsive interface across all devices
- Touch-friendly interactions and navigation
- Adaptive layouts for mobile, tablet, and desktop
- Optimized performance on all screen sizes

## Core Workflow

```
1. SEARCH INITIATION
   ├── User enters: Company name, Role, Key highlights
   ├── Optional: Resume upload, Tone selection
   └── Trigger: runChain() via /api/run endpoint

2. COMPANY RESEARCH (researchAgent)
   ├── Web search via Perplexity API
   ├── Gather company info, news, funding
   ├── Identify key contacts (hiring managers, leadership)
   └── Extract verified sources

3. VERIFICATION (verifyAgent)
   ├── Fact-check claims via Groq API
   ├── Validate sources (< 12 months old preferred)
   ├── Identify 2 key contacts (primary + secondary)
   └── Return verified, source-attributed claims

4. MESSAGE GENERATION (messagingAgent)
   ├── Generate personalized cold email
   │   ├── Subject line + body (90-100 words)
   │   └── Tone: Apply selected tone
   │
   └── Generate LinkedIn message
       ├── Length: 44 words
       └── Tone: Apply selected tone

5. DISPLAY & INTERACTION
   ├── Show: Research findings, verified points, sources
   ├── Display: Generated email and LinkedIn message
   └── Actions: Copy, regenerate, rephrase, save to history
```

### Writing Tones

| Tone | Style | Use Case |
|------|-------|----------|
| **Formal** | Professional, corporate | Executive outreach |
| **Casual & Friendly** | Gen-Z, approachable | Startup/tech recruiting |
| **Warm & Personal** | Empathetic, relationship-focused | Networking |
| **Intellectual** | Thoughtful, analytical | Research/thought leadership |
| **Confident** | Assertive, results-driven | Sales pitches |
| **Conversational** | Friendly, natural | General outreach |

## Technology Stack

### Frontend
- **Next.js 14.2.5** - React framework with App Router
- **TypeScript 5.9.2** - Type-safe development
- **Tailwind CSS 4.1.11** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **LangChain** - AI agent orchestration
- **Edge Runtime** - Serverless API functions

### AI & APIs
- **Groq API** - Fast LLM inference (llama-3.3-70b-versatile)
- **Perplexity AI** - Real-time web search and research
- **Company Autocomplete API** - Business data enrichment

### Development Tools
- **ESLint** - Code linting
- **Drizzle ORM** - Type-safe database operations
- **PostCSS** - CSS processing

## Quick Start

### Prerequisites

- Node.js 18.0+
- npm or yarn
- Supabase account
- API keys for Groq and Perplexity

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prakharnag/outreach.ai.git
   cd outreach.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**

   Create a `.env.local` file:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # AI API Keys
   GROQ_API_KEY=your_groq_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key

   # Optional
   DATABASE_URL=your_database_url
   ```

4. **Database Setup**

   Run the Supabase migrations:
   ```bash
   # Initialize Supabase
   npx supabase start

   # Push migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Getting API Keys

#### Groq API
1. Visit [Groq Console](https://console.groq.com/)
2. Create an account and generate an API key
3. Add to `.env.local` as `GROQ_API_KEY`

#### Perplexity AI
1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Generate an API key
3. Add to `.env.local` as `PERPLEXITY_API_KEY`

## Project Structure

```
outreach.ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── run/                  # Main research pipeline
│   │   ├── messaging/            # Message generation
│   │   ├── rephrase/             # Tone-based rephrasing
│   │   ├── company-autocomplete/ # Company search
│   │   ├── contact-results/      # Contact management
│   │   ├── history/              # Email/LinkedIn history
│   │   ├── user/resume/          # Resume management
│   │   ├── analytics/            # Usage analytics
│   │   └── rate-limit-status/    # Rate limit tracking
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main application interface
│   └── landingpage/              # Marketing site
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components
│   │   ├── dashboard.tsx         # Main dashboard layout
│   │   ├── research-output.tsx   # Research display
│   │   ├── resume-upload.tsx     # Resume upload widget
│   │   ├── resume-viewer.tsx     # Resume management
│   │   ├── tone-selector.tsx     # Writing tone selector
│   │   ├── company-autocomplete.tsx
│   │   ├── rate-limit-status.tsx
│   │   └── ... (36 components total)
│   └── NavigationSidebar.tsx     # Main navigation
│
├── lib/                          # Core business logic
│   ├── agents.ts                 # Agent orchestration
│   ├── researchAgent.ts          # Company research AI
│   ├── verifyAgent.ts            # Data verification AI
│   ├── messagingAgent.ts         # Message generation AI
│   ├── langchain-orchestrator.ts # Main AI orchestration
│   ├── chain.ts                  # AI agent chains
│   ├── api.ts                    # External API integrations
│   ├── db.ts                     # Database utilities
│   ├── supabase.ts               # Supabase client
│   ├── tones.ts                  # Writing tone configs
│   ├── resumeUtils.ts            # Resume handling
│   ├── universalRateLimiter.ts   # Rate limiting
│   ├── schema.ts                 # Database schemas
│   └── utils.ts                  # Shared utilities
│
├── contexts/                     # React contexts
│   └── auth-context.tsx          # Authentication state
│
├── hooks/                        # Custom React hooks
│   ├── useUser.ts                # User authentication hook
│   └── useContactResults.ts      # Contact history hook
│
├── supabase/migrations/          # Database migrations (23 files)
│   ├── 001-008                   # Core schema
│   ├── 012-017                   # Resume storage
│   └── 018-023                   # Rate limiting & usage
│
└── types/                        # TypeScript definitions
    └── index.ts                  # Global types
```

## API Documentation

### Base URLs

```
Production: https://your-domain.vercel.app/api
Development: http://localhost:3000/api
```

### Authentication

Most endpoints require authentication via Supabase Auth:

```
Authorization: Bearer <your_access_token>
```

### Main Endpoints

#### Run Research Pipeline

**POST** `/api/run`

Execute the complete research and outreach pipeline.

**Request:**
```json
{
  "company": "Company Name",
  "domain": "company.com",
  "role": "Software Engineer",
  "highlights": "Technical background, open source contributor",
  "tone": "conversational",
  "useResume": true
}
```

**Response:**
```json
{
  "research": {
    "company_overview": "...",
    "key_business_points": {...},
    "confidence_assessment": {...}
  },
  "contact": {
    "name": "John Doe",
    "title": "CTO",
    "email": "john@company.com"
  },
  "outputs": {
    "email": "Generated email content",
    "linkedin": "Generated LinkedIn message"
  }
}
```

#### Generate Messages

**POST** `/api/messaging`

Generate email and/or LinkedIn messages.

**Request:**
```json
{
  "company": "Company Name",
  "role": "Software Engineer",
  "tone": "conversational",
  "messageType": "email" // optional: "email" | "linkedin" | both
}
```

#### Rephrase Message

**POST** `/api/rephrase`

Rephrase existing message with different tone.

**Request:**
```json
{
  "content": "Original message content",
  "tone": "formal",
  "type": "email" // or "linkedin"
}
```

#### Rate Limit Status

**GET** `/api/rate-limit-status`

Get current rate limit status for the authenticated user.

**Response:**
```json
{
  "limits": [
    {
      "action": "search",
      "limit": 15,
      "used": 7,
      "remaining": 8,
      "resets_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Rate Limits

- **Searches:** 15 per day
- **LinkedIn Rephrases:** 5 per day
- **Email Rephrases:** Unlimited
- **Message Regeneration:** Unlimited

## Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/prakharnag/outreach.ai)

### Manual Deployment

#### 1. Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### 2. Environment Variables

Set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `PERPLEXITY_API_KEY`

#### 3. Database Configuration

1. Create Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Enable Google OAuth (optional)

#### 4. Custom Domain

1. Vercel dashboard → Settings → Domains
2. Add custom domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

## Known Issues

### Fixed Issues ✅

1. **Tone Selection Synchronization** - Tone now syncs properly between search panel and output
2. **Cold Email Greeting** - Proper greetings for all tones
3. **LinkedIn Message Greeting** - Fixed "Hi there" fallback issue
4. **Regenerate Button State** - Independent email/LinkedIn regeneration
5. **Resume Data Synchronization** - Real-time sync across components
6. **Resume Upload** - Enhanced error handling and file support
7. **Universal Rate Limiting** - Simple, effective rate limiting system
8. **Model Deprecation** - Automatic fallback from deprecated models

### Open Issues 🔴

1. **Email Container Styling** - Minor spacing issue between output and buttons
2. **Company Search Fallback** - Could add better guidance when company not found
3. **Key Highlights Label** - Could mark as optional with helpful tooltip

## Recent Updates

### V2.4.0 - Model Deprecation Handling
- Automatic handling of deprecated AI models
- Fallback from `llama3-70b-8192` to `llama-3.3-70b-versatile`
- Zero-downtime transition with centralized model management

### V2.3.0 - Email Formatting & Resume Recovery
- Fixed email paragraph formatting
- Automatic resume URL expiration recovery
- Original filename preservation
- Enhanced email validation and structure

### V2.2.0 - Resume Toggle Synchronization
- Fixed resume toggle state sync
- Performance optimization (removed unnecessary re-renders)
- Enhanced state management

### V2.1.0 - History Management
- Smart history grouping by company
- Enhanced mobile responsiveness
- Improved delete functionality

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Guidelines

- **TypeScript** - Strict mode with proper typing
- **Error Handling** - Comprehensive error handling
- **Testing** - Unit, integration, and E2E tests
- **Security** - Follow security best practices
- **Performance** - Optimize for speed and efficiency

### Code Quality Standards

- Follow existing patterns and naming conventions
- Use Tailwind CSS for styling
- Implement proper error boundaries
- Write tests for new features
- Update documentation

## Security

- **Data Encryption** - All sensitive data encrypted at rest
- **API Rate Limiting** - Prevents abuse and ensures stability
- **User Privacy** - GDPR compliant data handling
- **Secure Authentication** - Supabase Auth with OAuth support
- **Row Level Security** - RLS policies on all database tables

## Performance

- **Page Load** - < 2 seconds average
- **API Response** - < 500ms for most calls
- **Caching** - 7-day cache for research results
- **Edge Runtime** - Global deployment for low latency
- **Bundle Optimization** - Optimized code splitting

## Support

- **Issues** - [GitHub Issues](https://github.com/prakharnag/outreach.ai/issues)
- **Email** - support@outreach.ai
- **Discord** - [Join our community](https://discord.gg/outreach-ai)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Styling system
- [LangChain](https://langchain.com/) - AI agent orchestration
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Groq](https://groq.com/) - Fast LLM inference
- [Perplexity AI](https://www.perplexity.ai/) - Real-time research

---

**Built with ❤️ by the Outreach.ai Team**
