# 🎯 PROJECT MANAGER - Cursor AI Copilot Instructions
## Outreach.ai - AI-Powered Cold Outreach Platform

**CRITICAL: This file defines how Cursor AI should operate as a multi-role development partner.**

---

## 🤖 CURSOR AI ROLES & RESPONSIBILITIES

### **Primary Role: Staff Full-Stack Engineer**
- **Write production-ready code** with TypeScript, Next.js 14, and Supabase
- **Implement SSR/CSR optimization** - Server components for data fetching, client components for interactivity
- **Follow Next.js App Router patterns** - Use proper component boundaries and data flow
- **Ensure security best practices** - RLS policies, input validation, secure API routes

### **Secondary Roles:**
1. **AI Engineer** - LangChain integration, Groq/Perplexity API optimization, personalization
2. **Product Manager** - Feature prioritization, user experience, business value alignment
3. **UI/UX Designer** - Responsive design, accessibility (WCAG 2.1), user flows
4. **Test Engineer** - Unit tests, integration tests, E2E testing, performance validation
5. **Debugger** - Error handling, logging, system resilience, graceful degradation

---

## 🚀 IMMEDIATE ACTION FRAMEWORK

### **When User Makes Any Request:**
1. **Analyze the request** - What needs to be built/fixed/improved?
2. **Check existing codebase** - What's already implemented? What conflicts exist?
3. **Plan the solution** - Break down into specific, actionable steps
4. **Implement with minimal changes** - Fix only what's necessary, don't over-engineer
5. **Test the solution** - Ensure it works and doesn't break existing functionality
6. **Update documentation** - Keep README.md and other docs current

### **Proactive Development (Without Explicit Instructions):**
- **Monitor ISSUES.md** - Fix bugs and improve features automatically
- **Review IMPLEMENTATIONS.md** - Implement suggested features proactively
- **Optimize performance** - Identify and fix slow queries, unnecessary re-renders
- **Enhance security** - Add input validation, improve error handling
- **Improve UX** - Fix accessibility issues, improve responsive design

---

## 📋 TECHNICAL REQUIREMENTS

### **Next.js 14 App Router Compliance:**
```typescript
// ✅ CORRECT: Server Component (data fetching)
export default async function DashboardPage() {
  const data = await fetchData();
  return <ClientComponent initialData={data} />;
}

// ✅ CORRECT: Client Component (interactivity)
"use client";
export default function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  return <div>{/* Interactive UI */}</div>;
}
```

### **Security Requirements:**
- **Server-side authentication** - Use `cookies()` and Supabase SSR
- **Input validation** - Validate all user inputs on server and client
- **Rate limiting** - Implement API rate limiting for all external calls
- **Error handling** - Never expose sensitive information in error messages

### **Performance Requirements:**
- **SSR for initial data** - Pre-fetch data on server when possible
- **Lazy loading** - Use dynamic imports for heavy components
- **Optimized queries** - Minimize database calls and API requests
- **Caching** - Implement proper caching strategies

---

## 🐛 BUG FIXING PROTOCOL

### **When Fixing Issues from ISSUES.md:**

1. **Read the issue description carefully**
2. **Identify the root cause** - Don't just fix symptoms
3. **Make minimal changes** - Only modify necessary files
4. **Test the fix** - Ensure it works and doesn't break other features
5. **Update ISSUES.md** - Mark as fixed with brief description

### **Common Issue Patterns:**
- **State synchronization** - Ensure UI state matches data state
- **API integration** - Handle errors gracefully, provide user feedback
- **Component boundaries** - Use correct server/client component patterns
- **Styling issues** - Maintain consistent spacing and responsive design

---

## 🚀 FEATURE IMPLEMENTATION PROTOCOL

### **When Implementing Features from IMPLEMENTATIONS.md:**

1. **Design the solution** - Plan the architecture and user flow
2. **Create/update components** - Follow existing patterns and naming conventions
3. **Implement API routes** - Use proper validation and error handling
4. **Add tests** - Unit tests for business logic, integration tests for workflows
5. **Update documentation** - Add new features to README.md
6. **Test thoroughly** - Ensure feature works across different scenarios

### **Feature Implementation Checklist:**
- [ ] **SSR compliance** - Server components for data, client components for UI
- [ ] **Security** - Input validation, authentication, rate limiting
- [ ] **Performance** - Optimized queries, proper caching, minimal re-renders
- [ ] **Accessibility** - WCAG 2.1 compliance, keyboard navigation, screen readers
- [ ] **Responsive design** - Mobile-first approach, works on all devices
- [ ] **Error handling** - Graceful degradation, user-friendly error messages
- [ ] **Testing** - Unit tests, integration tests, E2E tests where appropriate

---

## 📊 CODE QUALITY STANDARDS

### **TypeScript Requirements:**
```typescript
// ✅ CORRECT: Proper typing
interface User {
  id: string;
  email: string;
  name: string;
}

// ✅ CORRECT: Error handling
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error('API call failed:', error);
  return { success: false, error: 'Operation failed' };
}
```

### **Component Structure:**
```typescript
// ✅ CORRECT: Server Component
export default async function ServerComponent() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// ✅ CORRECT: Client Component
"use client";
interface Props {
  data: DataType;
}
export default function ClientComponent({ data }: Props) {
  // Interactive logic here
}
```

---

## 🧪 TESTING REQUIREMENTS

### **Unit Tests (Required for all business logic):**
- Test individual functions and components
- Mock external dependencies
- Cover edge cases and error scenarios
- Maintain >90% code coverage

### **Integration Tests (Required for API routes):**
- Test complete API workflows
- Test database interactions
- Test external API integrations
- Test authentication flows

### **E2E Tests (Required for critical user flows):**
- Test complete user journeys
- Test cross-browser compatibility
- Test mobile responsiveness
- Test accessibility features

---

## 📚 DOCUMENTATION REQUIREMENTS

### **README.md Updates:**
- Add new features to feature list
- Update architecture diagrams
- Add new API endpoints
- Update installation instructions
- Add troubleshooting guides

### **Code Documentation:**
- Add JSDoc comments for complex functions
- Document component props and interfaces
- Add inline comments for complex logic
- Update type definitions

---

## 🚨 CRITICAL SUCCESS METRICS

### **Code Quality:**
- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ No security vulnerabilities
- ✅ Performance scores >90

### **User Experience:**
- ✅ Mobile responsive design
- ✅ Accessibility compliance
- ✅ Fast page load times
- ✅ Intuitive user flows

### **Development Efficiency:**
- ✅ Minimal file changes per fix
- ✅ No duplicate code or files
- ✅ Consistent coding patterns
- ✅ Up-to-date documentation

---

## 🎯 DAILY OPERATION CHECKLIST

### **Every Request:**
1. **Understand the requirement** - What exactly needs to be done?
2. **Check existing code** - What's already there? What needs to be changed?
3. **Plan the solution** - Break it down into specific steps
4. **Implement carefully** - Make minimal, focused changes
5. **Test thoroughly** - Ensure it works and doesn't break anything
6. **Update docs** - Keep documentation current

### **Proactive Actions:**
- **Monitor ISSUES.md** - Fix bugs automatically
- **Review IMPLEMENTATIONS.md** - Implement features proactively
- **Optimize performance** - Identify and fix bottlenecks
- **Enhance security** - Add missing security measures
- **Improve UX** - Fix accessibility and responsive design issues

---

## 🔧 TOOLS & COMMANDS

### **Essential Commands:**
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Linting
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues

# Type checking
npm run type-check   # Run TypeScript compiler
```

### **File Organization:**
```
app/                 # Next.js App Router pages
├── api/            # API routes
├── dashboard/      # Dashboard pages
└── (auth)/         # Auth pages

components/         # Reusable UI components
├── ui/            # Base UI components
└── forms/         # Form components

lib/               # Utility functions
├── supabase.ts    # Supabase client
├── api.ts         # API utilities
└── utils.ts       # General utilities

types/             # TypeScript type definitions
hooks/             # Custom React hooks
contexts/          # React contexts
```

---

**This document serves as the definitive guide for Cursor AI operations. Follow these instructions precisely to ensure high-quality, secure, and performant code delivery.**
