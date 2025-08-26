# Integration Test Setup Guide

## Prerequisites for Integration Testing

### 1. Test Environment Configuration
```bash
# Install integration testing tools
npm install --save-dev @playwright/test cypress

# Set up test environment variables
cp .env.example .env.test
# Configure test database URL, API keys, etc.
```

### 2. Database Setup
```bash
# Create test database
npx supabase start --config test
# Run migrations on test DB
npm run db:migrate:test
```

### 3. Browser Automation Setup
```bash
# Playwright setup
npx playwright install
# Create playwright.config.ts
```

### 4. Integration Test Scripts
```json
{
  "scripts": {
    "test:integration": "playwright test",
    "test:e2e": "cypress run",
    "test:all": "npm run test && npm run test:integration"
  }
}
```

## Integration Test Categories

### 1. API Integration Tests
- **Real API Endpoints with Live Database**
  - Test `/api/messaging` with actual Groq API calls
  - Validate database persistence for company research cache
  - Test Supabase authentication flows with real tokens
  
- **messageType Parameter Validation**
  - Send `messageType: 'email'` → verify only email generated
  - Send `messageType: 'linkedin'` → verify only LinkedIn generated  
  - Send no messageType → verify both messages generated
  - Validate token usage reduction with targeted generation
  
- **Rate Limiting and Error Scenarios**
  - Test Groq API rate limits → verify graceful degradation
  - Test network timeouts → verify user-friendly error messages
  - Test invalid API keys → verify proper error handling
  - Test database connection failures → verify fallback behavior

### 2. User Flow Integration Tests (End-to-End Workflows)

#### 🟢 **User Authentication**
- **Signup Workflow**
  - Navigate to `/signup`
  - Fill in name, email, password fields
  - Submit form → confirm success message appears
  - Verify redirect to dashboard
  - Test validation errors for invalid inputs
  
- **Login Workflow**
  - Navigate to `/login`
  - Enter valid credentials → assert redirect to `/dashboard`
  - Enter invalid credentials → show clear error message
  - Test "Remember me" functionality
  - Test password reset flow

#### 🟢 **Company Search**
- **Search by Company Name (Happy Path)**
  - Type "Google" → verify autocomplete suggestions appear
  - Select suggestion → verify company data populated
  - Test search results accuracy and relevance
  
- **Company Not Found Scenarios**
  - Search "NonExistentCompany123" → verify no results
  - Verify enhanced guidance message: "Try searching with website URL"
  - Test examples shown: "google.com, microsoft.com"
  
- **Autocomplete Validation**
  - Test debounced search requests (no excessive API calls)
  - Test keyboard navigation (arrow keys, enter selection)
  - Test accessibility (screen reader compatibility)

#### 🟢 **Resume Upload**
- **File Upload Workflows**
  - Navigate to `/resume` or resume section
  - Upload valid PDF → verify extracted text appears in preview
  - Upload invalid file (e.g., .txt, .jpg) → verify clear error message
  - Test file size limits → verify appropriate error handling
  
- **Resume Integration**
  - Upload resume → generate messages → verify personalization
  - Toggle "use resume" → verify messages adapt accordingly
  - Test resume content extraction accuracy

#### 🟢 **Cold Email & LinkedIn Generator**
- **Message Generation**
  - Fill company + role → click Generate → verify personalized email text
  - Verify LinkedIn message is conversational, avoids "Hi there" fallback
  - Test different tones (formal, conversational, intellectual)
  - Validate contact name extraction and usage
  
- **Independent Regeneration (Token Optimization)**
  - Generate initial messages → verify both email and LinkedIn appear
  - Click "Regenerate Email" → verify only email changes, LinkedIn stays same
  - Click "Regenerate LinkedIn" → verify only LinkedIn changes, email stays same
  - Monitor network requests → confirm targeted API calls
  
- **Resume Personalization**
  - Enable resume personalization → verify enhanced message content
  - Disable resume personalization → verify generic but still personalized messages

#### 🟢 **UI/UX Controls & Navigation**
- **Toggle Switch Persistence**
  - Toggle resume personalization → refresh page → verify state persisted
  - Toggle tone preferences → verify changes reflected in generation
  - Test toggle accessibility (keyboard navigation, screen readers)
  
- **Navigation Workflows**
  - Test navbar routes: Home → Dashboard → Settings → Logout
  - Verify protected routes redirect to login when unauthenticated
  - Test breadcrumb navigation consistency
  
- **Button Styling and Spacing**
  - Verify email vs LinkedIn output containers have correct spacing
  - Test regenerate buttons are properly positioned and styled
  - Validate responsive design on mobile devices
  - Test button disabled states during loading

### 3. Performance Integration Tests
- **Real Response Time Measurement**
  - Measure complete message generation workflow (< 10 seconds)
  - Test company search response times (< 2 seconds)
  - Validate resume upload and processing speed
  
- **Large Dataset Handling**
  - Test with companies having extensive research data
  - Validate performance with long resume content
  - Test autocomplete with large suggestion lists
  
- **Loading States and User Feedback**
  - Verify spinners appear during message generation
  - Test progress indicators for file uploads
  - Validate timeout handling with user notifications

### 4. Cross-Browser Integration Tests
- **Browser Compatibility**
  - Test complete workflows in Chrome, Firefox, Safari
  - Validate file upload functionality across browsers
  - Test clipboard copy functionality for generated messages
  
- **Responsive Design Validation**
  - Test mobile device interactions (touch, swipe)
  - Validate tablet layout adaptations
  - Test accessibility features across devices
  
- **Screen Reader Compatibility**
  - Test complete workflow with screen reader software
  - Validate ARIA labels and focus management
  - Test keyboard-only navigation paths

## Current Status
✅ Unit Tests: 45/45 passing with comprehensive mocking
❌ Integration Tests: Environment setup required
❌ E2E Tests: Browser automation setup required

## Implementation Examples

### Playwright Integration Test Example
```typescript
// tests/integration/userFlow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow', () => {
  test('should complete signup → login → generate messages → regenerate email only', async ({ page }) => {
    // 1. Signup Flow
    await page.goto('/signup');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="signup-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 2. Login Flow
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'SecurePass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
    
    // 3. Company Search with Enhanced Guidance
    await page.fill('[data-testid="company-search"]', 'NonExistentCompany123');
    await expect(page.locator('text=Try searching with website URL')).toBeVisible();
    await expect(page.locator('text=google.com, microsoft.com')).toBeVisible();
    
    // 4. Successful Company Search
    await page.fill('[data-testid="company-search"]', 'Google');
    await page.click('[data-testid="company-suggestion"]');
    await page.fill('[data-testid="role-input"]', 'Software Engineer');
    
    // 5. Generate Initial Messages
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="linkedin-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-message"]')).toBeVisible();
    
    // Store original messages for comparison
    const originalLinkedin = await page.locator('[data-testid="linkedin-message"]').textContent();
    const originalEmail = await page.locator('[data-testid="email-message"]').textContent();
    
    // 6. Test Independent Email Regeneration
    await page.click('[data-testid="regenerate-email-button"]');
    await expect(page.locator('[data-testid="loading-spinner-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-spinner-email"]')).not.toBeVisible();
    
    // Verify only email changed, LinkedIn stayed the same
    const newLinkedin = await page.locator('[data-testid="linkedin-message"]').textContent();
    const newEmail = await page.locator('[data-testid="email-message"]').textContent();
    
    expect(newLinkedin).toBe(originalLinkedin); // LinkedIn unchanged
    expect(newEmail).not.toBe(originalEmail);   // Email changed
  });
  
  test('should handle resume upload and personalization', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Upload resume
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-resume-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/sample-resume.pdf');
    
    // Verify resume content extracted
    await expect(page.locator('[data-testid="resume-preview"]')).toBeVisible();
    
    // Enable resume personalization
    await page.check('[data-testid="use-resume-toggle"]');
    
    // Generate messages with resume
    await page.fill('[data-testid="company-search"]', 'Microsoft');
    await page.fill('[data-testid="role-input"]', 'Senior Developer');
    await page.click('[data-testid="generate-button"]');
    
    // Verify personalized content includes resume details
    const linkedinMessage = await page.locator('[data-testid="linkedin-message"]').textContent();
    expect(linkedinMessage).toContain('experience'); // Should reference resume content
  });
});
```

### API Integration Test Example
```typescript
// tests/integration/api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('should validate messageType parameter with real Groq API', async ({ request }) => {
    // Test email-only generation
    const emailResponse = await request.post('/api/messaging', {
      data: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'email'
      }
    });
    
    const emailData = await emailResponse.json();
    expect(emailData).toHaveProperty('email');
    expect(emailData).not.toHaveProperty('linkedin');
    
    // Test LinkedIn-only generation  
    const linkedinResponse = await request.post('/api/messaging', {
      data: {
        company: 'Google',
        role: 'Software Engineer', 
        messageType: 'linkedin'
      }
    });
    
    const linkedinData = await linkedinResponse.json();
    expect(linkedinData).toHaveProperty('linkedin');
    expect(linkedinData).not.toHaveProperty('email');
  });
  
  test('should handle rate limiting gracefully', async ({ request }) => {
    // Make multiple rapid requests to trigger rate limiting
    const requests = Array(10).fill(null).map(() => 
      request.post('/api/messaging', {
        data: { company: 'Test', role: 'Engineer' }
      })
    );
    
    const responses = await Promise.all(requests);
    
    // Some should succeed, some should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## Recommendation
The current unit test coverage provides excellent confidence in the code functionality. Integration tests should be set up as a separate initiative with proper test environment configuration.

## Next Steps for Integration Testing

### 1. Environment Setup
```bash
# Install integration testing tools
npm install --save-dev @playwright/test

# Set up environment variables
cp .env.example .env.test
# Configure: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY

# Initialize Playwright
npx playwright install
```

### 2. Test Configuration Files
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. CI/CD Integration
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start test database
        run: npx supabase start
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 4. Test Execution Commands
```json
{
  "scripts": {
    "test:unit": "jest",
    "test:integration": "playwright test",
    "test:integration:ui": "playwright test --ui",
    "test:integration:headed": "playwright test --headed",
    "test:all": "npm run test:unit && npm run test:integration",
    "test:ci": "npm run test:unit && npm run test:integration --reporter=github"
  }
}
```

### 5. Success Metrics
- ✅ All user authentication flows work
- ✅ Company search with enhanced guidance functions correctly  
- ✅ Resume upload and personalization integration works
- ✅ Independent message regeneration reduces token usage
- ✅ Cross-browser compatibility validated
- ✅ Performance benchmarks met (< 10s generation, < 2s search)
- ✅ Accessibility compliance verified
- ✅ Error handling provides clear user feedback

## Benefits of Integration Testing
1. **User Confidence**: Validates complete workflows end-to-end
2. **Performance Validation**: Real-world response time measurement
3. **Cross-Browser Support**: Ensures compatibility across platforms
4. **Accessibility Compliance**: Screen reader and keyboard navigation testing
5. **Token Optimization Proof**: Validates actual API cost reduction
6. **UX Validation**: Confirms enhanced guidance improves user success rates
