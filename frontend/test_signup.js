/* global require */
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  try {
    await page.goto('http://localhost:5173/signup', { waitUntil: 'networkidle0' });
    console.log("Page loaded successfully.");
    const content = await page.content();
    if (content.includes("Loading workspace")) {
        console.log("WARNING: Page says Loading workspace");
    }
  } catch (err) {
    console.error("Navigation error:", err);
  } finally {
    await browser.close();
  }
})();
