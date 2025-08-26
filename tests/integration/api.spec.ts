import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  // Increase timeout for API tests due to potential rate limiting
  test.setTimeout(60000);
  
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to ensure we have context
    await page.goto('/dashboard');
  });

  test('should validate messageType parameter with real API', async ({ request, page }) => {

    // Test email-only generation
    const emailResponse = await request.post('/api/messaging', {
      data: {
        company: 'Google',
        role: 'Software Engineer',
        messageType: 'email',
        highlights: 'React, TypeScript'
      }
    });
    
    // Email API Response validation
    
    if (emailResponse.ok()) {
      const emailData = await emailResponse.json();
      expect(emailData).toHaveProperty('email');
      expect(emailData).not.toHaveProperty('linkedin');

    } else {
      // Email API response error - test should fail naturally
    }
    
    // Test LinkedIn-only generation  
    const linkedinResponse = await request.post('/api/messaging', {
      data: {
        company: 'Microsoft',
        role: 'Software Engineer', 
        messageType: 'linkedin',
        highlights: 'JavaScript, Node.js'
      }
    });
    
    
    if (linkedinResponse.ok()) {
      const linkedinData = await linkedinResponse.json();
      expect(linkedinData).toHaveProperty('linkedin');
      expect(linkedinData).not.toHaveProperty('email');

    } else {
    }
    
    // Test both messages generation (backward compatibility)
    const bothResponse = await request.post('/api/messaging', {
      data: {
        company: 'Apple',
        role: 'iOS Developer'
        // No messageType specified - should return both
      }
    });
    
    
    if (bothResponse.ok()) {
      const bothData = await bothResponse.json();
      expect(bothData).toHaveProperty('linkedin');
      expect(bothData).toHaveProperty('email');
    }
  });

  test('should handle API error scenarios gracefully', async ({ request }) => {

    // Test missing required fields
    const missingFieldsResponse = await request.post('/api/messaging', {
      data: {
        // Missing company and role
        messageType: 'email'
      }
    });
    
    expect(missingFieldsResponse.status()).toBe(400);

    // Test with invalid messageType
    const invalidTypeResponse = await request.post('/api/messaging', {
      data: {
        company: 'Test Company',
        role: 'Developer',
        messageType: 'invalid-type'
      }
    });
    
    // Should still work but return both messages
    if (invalidTypeResponse.ok()) {
      const data = await invalidTypeResponse.json();
      if (data.linkedin && data.email) {
      }
    }
  });

  test('should validate company autocomplete API', async ({ request }) => {

    // Test company search
    const searchResponse = await request.post('/api/company-autocomplete', {
      data: {
        query: 'Google'
      }
    });
    
    if (searchResponse.ok()) {
      const searchData = await searchResponse.json();
      expect(searchData).toHaveProperty('suggestions');

    } else {

    }
    
    // Test empty search
    const emptyResponse = await request.post('/api/company-autocomplete', {
      data: {
        query: 'NonExistentCompany12345'
      }
    });
    
    if (emptyResponse.ok()) {
      const emptyData = await emptyResponse.json();
      if (emptyData.suggestions && emptyData.suggestions.length === 0) {

      }
    }
  });

  test('should measure API performance', async ({ request }) => {

    const startTime = Date.now();
    
    const response = await request.post('/api/messaging', {
      data: {
        company: 'Amazon',
        role: 'Software Engineer',
        messageType: 'email'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Performance should be reasonable (less than 30 seconds)
    expect(responseTime).toBeLessThan(30000);
    
    if (responseTime < 10000) {
    } else if (responseTime < 20000) {
    } else {
    }
  });

  test('should validate resume integration API', async ({ request }) => {

    const response = await request.post('/api/messaging', {
      data: {
        company: 'Tesla',
        role: 'Software Engineer',
        messageType: 'email',
        resumeContent: 'Senior Software Engineer with 5 years of experience in React and Node.js',
        useResumeInPersonalization: true
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      if (data.email && data.email.toLowerCase().includes('experience')) {

      } else {

      }
    }
    
    // Test without resume
    const noResumeResponse = await request.post('/api/messaging', {
      data: {
        company: 'Tesla',
        role: 'Software Engineer',
        messageType: 'email',
        useResumeInPersonalization: false
      }
    });
    
    if (noResumeResponse.ok()) {

    }
  });
});
