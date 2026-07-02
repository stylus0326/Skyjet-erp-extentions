import puppeteer from 'puppeteer-core';

async function main() {
  try {
    console.log('Connecting to Chrome on port 9222...');
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222'
    });

    console.log('Successfully connected!');
    const pages = await browser.pages();
    console.log(`Found ${pages.length} open pages/tabs:`);
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      try {
        const title = await page.title();
        const url = page.url();
        console.log(`Tab ${i + 1}: [${title}] - URL: ${url}`);
      } catch (err: any) {
        console.log(`Tab ${i + 1}: Error reading metadata: ${err.message}`);
      }
    }

    await browser.disconnect();
  } catch (err: any) {
    console.error('Connection error:', err);
  }
}

main();
