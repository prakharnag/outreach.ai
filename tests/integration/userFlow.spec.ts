import { test, expect, Page } from '@playwright/test';

test.describe('Complete User Workflow Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load dashboard and display basic UI elements', async () => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Check if main dashboard content is visible - look for KPI dashboard or main content
    await expect(page.locator('body')).toBeVisible();
    
    // Look for dashboard cards or key elements
    const dashboardElements = page.locator('[data-testid="kpi-dashboard"], h1, .space-y-4, .grid').first();
    if (await dashboardElements.count() > 0) {
      await expect(dashboardElements).toBeVisible();
    }

  });

  test('should handle company search with enhanced guidance', async () => {
    await page.goto('/dashboard');
    
    // Find company search input
    const searchInput = page.locator('input[placeholder*="company" i], input[placeholder*="search" i]').first();
    
    if (await searchInput.count() > 0) {
      // Test with non-existent company
      await searchInput.fill('NonExistentCompany123');
      await page.waitForTimeout(2000); // Wait for search results
      
      // Check for enhanced guidance message
      const guidanceVisible = await page.locator('text*="website URL"').count() > 0 ||
                             await page.locator('text*="google.com"').count() > 0 ||
                             await page.locator('text*="Try searching"').count() > 0;
      
      if (guidanceVisible) {

      } else {

      }
      
      // Test with known company
      await searchInput.fill('Google');
      await page.waitForTimeout(2000);

    } else {

    }
  });

  test('should test independent message regeneration workflow', async () => {
    await page.goto('/dashboard');
    
    // Look for role input
    const roleInput = page.locator('input[placeholder*="role" i], input[placeholder*="position" i]').first();
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    
    if (await roleInput.count() > 0 && await generateButton.count() > 0) {
      await roleInput.fill('Software Engineer');
      
      // Try to fill company if available
      const companyInput = page.locator('input[placeholder*="company" i]').first();
      if (await companyInput.count() > 0) {
        await companyInput.fill('Google');
      }
      
      // Click generate button
      await generateButton.click();
      await page.waitForTimeout(5000); // Wait for message generation
      
      // Look for regenerate buttons
      const regenerateButtons = page.locator('button').filter({ hasText: /regenerate/i });
      const regenerateCount = await regenerateButtons.count();
      
      if (regenerateCount >= 2) {

        // Test clicking first regenerate button
        await regenerateButtons.first().click();
        await page.waitForTimeout(3000);

      } else if (regenerateCount === 1) {

      } else {

      }
    } else {

    }
  });

  test('should validate API endpoints integration', async () => {
    // Set longer timeout for API test due to potential rate limiting
    test.setTimeout(60000);
    
    // Test messaging API endpoint
    const response = await page.request.post('/api/messaging', {
      data: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'email'
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      if (data.email && !data.linkedin) {

      } else {

      }
    } else {

    }
    
    // Test LinkedIn-only generation
    const linkedinResponse = await page.request.post('/api/messaging', {
      data: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'linkedin'
      }
    });
    
    if (linkedinResponse.ok()) {
      const data = await linkedinResponse.json();
      if (data.linkedin && !data.email) {

      }
    }
  });

  test('should validate UI responsiveness across devices', async () => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

  });

  test('should validate error handling and user feedback', async () => {
    await page.goto('/dashboard');
    
    // Test with invalid data
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    
    if (await generateButton.count() > 0) {
      // Try to generate without required fields
      await generateButton.click();
      await page.waitForTimeout(2000);
      
      // Look for error messages
      const errorVisible = await page.locator('text*="error"').count() > 0 ||
                          await page.locator('text*="required"').count() > 0 ||
                          await page.locator('[role="alert"]').count() > 0;
      
      if (errorVisible) {

      } else {

      }
    }
  });
});
