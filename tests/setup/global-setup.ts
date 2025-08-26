import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {

  // Check if the development server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the server to be ready
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  } catch (error) {
    console.error('❌ Development server is not ready:', error);
    throw new Error('Development server failed to start. Please run "npm run dev" first.');
  } finally {
    await browser.close();
  }

}

export default globalSetup;
