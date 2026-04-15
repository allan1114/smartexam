#!/usr/bin/env node

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '../docs/screenshots');

// Create screenshots directory if it doesn't exist
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.createContext();
  const page = await context.newPage();

  try {
    console.log('🎬 Capturing screenshots...\n');

    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to local dev server (try 3000, 3001, 5173)
    let baseUrl = 'http://localhost:3000';
    for (const port of [3000, 3001, 5173]) {
      try {
        await page.goto(`http://localhost:${port}`, { timeout: 3000, waitUntil: 'networkidle' });
        baseUrl = `http://localhost:${port}`;
        console.log(`✓ Connected to ${baseUrl}`);
        break;
      } catch (e) {
        // Try next port
      }
    }

    // Screenshot 1: Home Page
    console.log('📸 Capturing Home page...');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-home-page.png') });
    console.log('✓ Saved: 01-home-page.png');

    // Screenshot 2: Settings Panel
    console.log('📸 Capturing Settings panel...');
    const settingsButton = page.locator('button[title="Settings"]');
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '02-settings-panel.png') });
      console.log('✓ Saved: 02-settings-panel.png');

      // Screenshot 3: Settings - API Key Section
      console.log('📸 Capturing Settings API Key section...');
      await page.locator('text=API Key').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, '03-settings-api-key.png') });
      console.log('✓ Saved: 03-settings-api-key.png');

      // Screenshot 4: Settings - Model Selection
      console.log('📸 Capturing Settings Model section...');
      await page.locator('text=AI Model').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, '04-settings-model.png') });
      console.log('✓ Saved: 04-settings-model.png');

      // Screenshot 5: Settings - Proxy Configuration
      console.log('📸 Capturing Settings Proxy section...');
      await page.locator('text=Proxy Configuration').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotsDir, '05-settings-proxy.png') });
      console.log('✓ Saved: 05-settings-proxy.png');

      // Close settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Screenshot 6: Dark Mode
    console.log('📸 Capturing Dark mode...');
    const themeButton = page.locator('button[title*="Dark Mode"]').or(page.locator('button[title*="Light Mode"]'));
    if (await themeButton.count() > 0) {
      await themeButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '06-dark-mode.png') });
      console.log('✓ Saved: 06-dark-mode.png');
    }

    console.log('\n✅ All screenshots captured successfully!\n');
    console.log('📁 Location: docs/screenshots/');
    console.log('\nScreenshots created:');
    fs.readdirSync(screenshotsDir).forEach(file => {
      console.log(`  - ${file}`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if dev server is running on any common port
function testConnection() {
  return new Promise((resolve) => {
    for (const port of [3000, 3001, 5173]) {
      const req = http.get(`http://localhost:${port}`, () => {
        resolve(true);
      });
      req.on('error', () => {
        // Try next port
      });
      req.end();
    }
    // If all fail after a moment, resolve with false
    setTimeout(() => resolve(false), 2000);
  });
}

(async () => {
  const isRunning = await testConnection();
  if (!isRunning) {
    console.error('❌ Development server is not running!');
    console.error('Please run: npm run dev');
    process.exit(1);
  }

  await captureScreenshots();
})();
