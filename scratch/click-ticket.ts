import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://orevazfyhtaujfxpvzvx.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_IPUHAaLYunMMuRkG9qfFFg_fQeyqAAO';

async function main() {
  console.log('Fetching open tabs from Chrome on port 9222...');
  let response;
  try {
    response = await fetch('http://127.0.0.1:9222/json');
  } catch (err: any) {
    console.error('Could not connect to Chrome on port 9222. Is Chrome running with remote debugging?', err.message);
    return;
  }

  const pages = await response.json();
  console.log(`Found ${pages.length} pages/tabs:`);
  let searchTransactionPage: any = null;

  for (const page of pages) {
    console.log(`- Title: "${page.title}" | URL: "${page.url}"`);
    if (page.url.includes('SearchTransaction') || page.title.includes('SearchTransaction')) {
      searchTransactionPage = page;
    }
  }

  if (!searchTransactionPage) {
    console.error('Could not find a tab containing the SearchTransaction page.');
    return;
  }

  console.log(`Connecting to tab: "${searchTransactionPage.title}"...`);
  const browser = await puppeteer.connect({
    browserWSEndpoint: searchTransactionPage.webSocketDebuggerUrl,
    defaultViewport: null
  });

  const allPages = await browser.pages();
  // Find the exact page matching our websocket debugger URL or title
  const page = allPages.find(p => p.url().includes('SearchTransaction') || p.url() === searchTransactionPage.url);

  if (!page) {
    console.error('Could not attach to the specific page.');
    await browser.disconnect();
    return;
  }

  console.log('Successfully attached to the SearchTransaction page!');
  
  // Set up console listeners to capture output from the page
  page.on('console', msg => {
    console.log(`[PAGE LOG] [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR] ${err.toString()}`);
  });

  // Check if the button exists
  const buttonExists = await page.evaluate(() => {
    const btn = document.querySelector('#skyjet-check-btn');
    return !!btn;
  });

  if (!buttonExists) {
    console.error('Could not find the button "#skyjet-check-btn" on the page.');
    await browser.disconnect();
    return;
  }

  console.log('Button "#skyjet-check-btn" found. Clicking it now...');
  
  // Query count before clicking
  console.log('Querying current Supabase ticket count...');
  let cacheRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  let cacheData = await cacheRes.json();
  const countBefore = cacheData.length;
  console.log(`Supabase ticket cache count before click: ${countBefore}`);

  // Click the button
  await page.evaluate(() => {
    const btn = document.querySelector('#skyjet-check-btn') as HTMLElement;
    if (btn) btn.click();
  });
  console.log('Clicked! Monitoring logs for 8 seconds...');

  await new Promise(resolve => setTimeout(resolve, 8000));

  // Query count after clicking
  console.log('Querying Supabase ticket count after processing...');
  cacheRes = await fetch(`${SUPABASE_URL}/rest/v1/vna_ticket_cache?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  cacheData = await cacheRes.json();
  const countAfter = cacheData.length;
  console.log(`Supabase ticket cache count after click: ${countAfter}`);
  
  if (countAfter > countBefore) {
    console.log(`Success! Ticket data cache increased by ${countAfter - countBefore} rows (from ${countBefore} to ${countAfter}).`);
  } else {
    console.log(`Ticket count did not increase (remained at ${countBefore}). Checking if any existing records were modified/created...`);
  }

  await browser.disconnect();
}

main().catch(console.error);
