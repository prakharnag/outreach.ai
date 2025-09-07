# 🧪 INTEGRATION TEST SETUP GUIDE
## Outreach.ai - End-to-End Testing Framework

**PRIORITY: HIGH** - Comprehensive testing ensures reliability, performance, and user satisfaction.

---

## 🎯 TESTING STRATEGY OVERVIEW

### **Testing Pyramid:**
```
    E2E Tests (10%)
   ┌─────────────────┐
  │  User Workflows  │
  │  Cross-browser   │
  │  Mobile/Desktop  │
  └─────────────────┘
      Integration Tests (20%)
     ┌─────────────────┐
    │  API Workflows   │
    │  Database        │
    │  External APIs   │
    └─────────────────┘
        Unit Tests (70%)
       ┌─────────────────┐
      │  Functions       │
      │  Components      │
      │  Business Logic  │
      └─────────────────┘
```

### **Test Categories:**
1. **Unit Tests** - Individual functions and components
2. **Integration Tests** - API routes and database interactions
3. **E2E Tests** - Complete user workflows
4. **Performance Tests** - Load testing and optimization
5. **Security Tests** - Authentication and authorization

---

## 🚀 QUICK START GUIDE

### **1. Install Dependencies**
```bash
# Install testing frameworks
npm install --save-dev @playwright/test @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom

# Install additional testing utilities
npm install --save-dev msw @types/jest supertest
```

### **2. Configure Testing Environment**
```bash
# Create test environment file
cp .env.example .env.test

# Set up test database
npx supabase start --config test
npx supabase db reset --config test
```

### **3. Run Tests**
```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:watch        # Watch mode
```

---

## 🔧 TEST CONFIGURATION

### **Jest Configuration** (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### **Playwright Configuration** (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 🧪 UNIT TESTING

### **Test Structure:**
```
tests/
├── unit/
│   ├── components/
│   │   ├── ui/
│   │   └── forms/
│   ├── lib/
│   │   ├── api.test.ts
│   │   ├── messagingAgent.test.ts
│   │   └── utils.test.ts
│   └── hooks/
└── __mocks__/
    ├── next/
    └── supabase/
```

### **Example Unit Test** (`tests/unit/lib/messagingAgent.test.ts`)
```typescript
import { messagingAgent } from '@/lib/messagingAgent';
import { mockSupabase } from '@/tests/__mocks__/supabase';

describe('messagingAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmail', () => {
    it('should generate personalized email with correct tone', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '5 years React experience',
        tone: 'conversational',
        contact: { name: 'John Doe', title: 'Hiring Manager' }
      };

      const result = await messagingAgent.generateEmail(mockData);

      expect(result).toContain('John Doe');
      expect(result).toContain('Google');
      expect(result).toContain('Software Engineer');
      expect(result).toMatch(/^(Hi|Hey|Hello)/);
    });

    it('should handle missing contact name gracefully', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '',
        tone: 'formal',
        contact: null
      };

      const result = await messagingAgent.generateEmail(mockData);

      expect(result).toContain('Hi there');
      expect(result).toContain('Google');
    });

    it('should throw error for invalid tone', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '',
        tone: 'invalid-tone',
        contact: null
      };

      await expect(messagingAgent.generateEmail(mockData))
        .rejects
        .toThrow('Invalid tone: invalid-tone');
    });
  });

  describe('validateLinkedInMessage', () => {
    it('should remove generic greetings', () => {
      const message = 'Hi there,\n\nI am interested in the position...';
      const result = messagingAgent.validateLinkedInMessage(message);
      
      expect(result).not.toContain('Hi there');
      expect(result).toContain('I am interested');
    });

    it('should preserve proper greetings', () => {
      const message = 'Hi John,\n\nI am interested in the position...';
      const result = messagingAgent.validateLinkedInMessage(message);
      
      expect(result).toContain('Hi John');
      expect(result).toContain('I am interested');
    });
  });
});
```

---

## 🔗 INTEGRATION TESTING

### **API Integration Tests** (`tests/integration/api/`)
```typescript
// tests/integration/api/messaging.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/messaging/route';

describe('/api/messaging', () => {
  it('should generate email only when messageType is email', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'email',
        tone: 'conversational'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('email');
    expect(data).not.toHaveProperty('linkedin');
  });

  it('should generate LinkedIn only when messageType is linkedin', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'linkedin',
        tone: 'conversational'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('linkedin');
    expect(data).not.toHaveProperty('email');
  });

  it('should handle rate limiting gracefully', async () => {
    // Mock rate limiter to return limit exceeded
    jest.spyOn(require('@/lib/rateLimiter'), 'checkLimit')
      .mockResolvedValue(false);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        company: 'Google',
        role: 'Software Engineer'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(429);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Rate limit exceeded');
  });
});
```

### **Database Integration Tests** (`tests/integration/database/`)
```typescript
// tests/integration/database/userTiers.test.ts
import { createClient } from '@supabase/supabase-js';
import { userTiers } from '@/lib/userTiers';

describe('User Tiers Integration', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('user_usage').delete().neq('id', '');
  });

  it('should track usage for free tier user', async () => {
    const userId = 'test-user-123';
    const tier = 'free';
    
    // Initialize user tier
    await userTiers.initializeUser(userId, tier);
    
    // Check initial usage
    const usage = await userTiers.getUsage(userId);
    expect(usage.companySearches).toBe(0);
    
    // Increment usage
    await userTiers.incrementUsage(userId, 'companySearches');
    
    // Verify usage updated
    const updatedUsage = await userTiers.getUsage(userId);
    expect(updatedUsage.companySearches).toBe(1);
  });

  it('should enforce tier limits', async () => {
    const userId = 'test-user-123';
    const tier = 'free';
    
    await userTiers.initializeUser(userId, tier);
    
    // Exceed free tier limit
    for (let i = 0; i < 11; i++) {
      await userTiers.incrementUsage(userId, 'companySearches');
    }
    
    // Check if limit enforced
    const canUse = await userTiers.checkLimit(userId, 'companySearches');
    expect(canUse).toBe(false);
  });
});
```

---

## 🌐 END-TO-END TESTING

### **E2E Test Structure** (`tests/e2e/`)
```
tests/e2e/
├── auth/
│   ├── login.spec.ts
│   └── signup.spec.ts
├── dashboard/
│   ├── company-search.spec.ts
│   ├── message-generation.spec.ts
│   └── resume-upload.spec.ts
├── api/
│   ├── rate-limiting.spec.ts
│   └── error-handling.spec.ts
└── mobile/
    └── responsive.spec.ts
```

### **Example E2E Test** (`tests/e2e/dashboard/message-generation.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Message Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should generate personalized messages with tone synchronization', async ({ page }) => {
    // Navigate to search panel
    await page.click('[data-testid="search-tab"]');
    
    // Select company
    await page.fill('[data-testid="company-search"]', 'Google');
    await page.click('[data-testid="company-suggestion"]');
    
    // Fill role
    await page.fill('[data-testid="role-input"]', 'Software Engineer');
    
    // Select tone
    await page.selectOption('[data-testid="tone-selector"]', 'conversational');
    
    // Generate messages
    await page.click('[data-testid="generate-button"]');
    
    // Wait for generation to complete
    await expect(page.locator('[data-testid="email-output"]')).toBeVisible();
    await expect(page.locator('[data-testid="linkedin-output"]')).toBeVisible();
    
    // Verify tone synchronization
    const emailTone = await page.locator('[data-testid="email-tone-selector"]').inputValue();
    const linkedinTone = await page.locator('[data-testid="linkedin-tone-selector"]').inputValue();
    
    expect(emailTone).toBe('conversational');
    expect(linkedinTone).toBe('conversational');
    
    // Verify message content
    const emailContent = await page.locator('[data-testid="email-output"]').textContent();
    const linkedinContent = await page.locator('[data-testid="linkedin-output"]').textContent();
    
    expect(emailContent).toContain('Google');
    expect(emailContent).toContain('Software Engineer');
    expect(linkedinContent).toContain('Google');
    expect(linkedinContent).toContain('Software Engineer');
  });

  test('should regenerate email independently', async ({ page }) => {
    // Generate initial messages
    await page.fill('[data-testid="company-search"]', 'Microsoft');
    await page.click('[data-testid="company-suggestion"]');
    await page.fill('[data-testid="role-input"]', 'Product Manager');
    await page.click('[data-testid="generate-button"]');
    
    // Wait for initial generation
    await expect(page.locator('[data-testid="email-output"]')).toBeVisible();
    
    // Store original content
    const originalEmail = await page.locator('[data-testid="email-output"]').textContent();
    const originalLinkedin = await page.locator('[data-testid="linkedin-output"]').textContent();
    
    // Regenerate email only
    await page.click('[data-testid="regenerate-email-button"]');
    
    // Wait for regeneration
    await expect(page.locator('[data-testid="email-output"]')).toBeVisible();
    
    // Verify only email changed
    const newEmail = await page.locator('[data-testid="email-output"]').textContent();
    const newLinkedin = await page.locator('[data-testid="linkedin-output"]').textContent();
    
    expect(newEmail).not.toBe(originalEmail);
    expect(newLinkedin).toBe(originalLinkedin);
  });

  test('should handle company not found gracefully', async ({ page }) => {
    // Search for non-existent company
    await page.fill('[data-testid="company-search"]', 'NonExistentCompany123');
    
    // Wait for search to complete
    await page.waitForTimeout(1000);
    
    // Verify fallback guidance appears
    await expect(page.locator('[data-testid="company-not-found-guidance"]')).toBeVisible();
    await expect(page.locator('text=Try searching with website URL')).toBeVisible();
    
    // Test URL fallback
    await page.click('[data-testid="enter-website-url-button"]');
    await expect(page.locator('[data-testid="website-url-input"]')).toBeVisible();
  });
});
```

---

## 📊 PERFORMANCE TESTING

### **Load Testing** (`tests/performance/`)
```typescript
// tests/performance/api-load.test.ts
import { test, expect } from '@playwright/test';

test.describe('API Load Testing', () => {
  test('should handle concurrent message generation requests', async ({ page }) => {
    const concurrentRequests = 10;
    const requests = [];
    
    // Create multiple concurrent requests
    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        page.request.post('/api/messaging', {
          data: {
            company: `Company${i}`,
            role: 'Engineer',
            messageType: 'email'
          }
        })
      );
    }
    
    // Wait for all requests to complete
    const responses = await Promise.all(requests);
    
    // Verify all requests succeeded
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
    
    // Verify response times are reasonable
    const responseTimes = responses.map(r => r.headers()['x-response-time']);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    expect(avgResponseTime).toBeLessThan(5000); // 5 seconds max
  });
});
```

---

## 🔒 SECURITY TESTING

### **Authentication Tests** (`tests/security/`)
```typescript
// tests/security/auth.test.ts
import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  test('should prevent unauthorized API access', async ({ page }) => {
    // Try to access protected API without authentication
    const response = await page.request.post('/api/messaging', {
      data: { company: 'Google', role: 'Engineer' }
    });
    
    expect(response.status()).toBe(401);
  });

  test('should validate input sanitization', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Try to inject malicious input
    const maliciousInput = '<script>alert("xss")</script>';
    await page.fill('[data-testid="company-search"]', maliciousInput);
    
    // Verify input is sanitized
    const inputValue = await page.inputValue('[data-testid="company-search"]');
    expect(inputValue).not.toContain('<script>');
  });

  test('should enforce rate limiting', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Make rapid requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        page.request.post('/api/messaging', {
          data: { company: 'Google', role: 'Engineer' }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 TEST EXECUTION COMMANDS

### **Package.json Scripts**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e --reporter=github"
  }
}
```

### **CI/CD Integration** (`.github/workflows/test.yml`)
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BROWSERS_PATH: 0
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

---

## 🎯 SUCCESS METRICS

### **Test Coverage Requirements:**
- **Unit Tests:** >90% code coverage
- **Integration Tests:** All API routes and database operations
- **E2E Tests:** All critical user workflows
- **Performance Tests:** <2s page load, <500ms API response
- **Security Tests:** All authentication and authorization flows

### **Quality Gates:**
- ✅ All tests passing
- ✅ No critical security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Cross-browser compatibility verified
- ✅ Mobile responsiveness confirmed

---

**This file serves as the comprehensive testing guide. Follow these patterns to ensure robust, reliable, and secure application testing.**
