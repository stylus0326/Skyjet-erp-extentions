import puppeteer from 'puppeteer-core';

async function main() {
  try {
    console.log('Connecting to Chrome on port 9222...');
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });

    console.log('Connected successfully!');
    const pages = await browser.pages();
    let erpPage = null;

    for (const page of pages) {
      const url = page.url();
      if (url.includes('erp.skyjet.vn') || url.includes('localhost') || url.includes('127.0.0.1')) {
        erpPage = page;
        break;
      }
    }

    if (!erpPage) {
      console.log('Could not find any tab with erp.skyjet.vn URL.');
      console.log('Open tabs:');
      for (const p of pages) {
        console.log(`- ${p.url()}`);
      }
      await browser.disconnect();
      return;
    }

    console.log(`Found ERP/Local tab: ${erpPage.url()}`);
    console.log('Taking screenshot of the page...');
    
    // Save to the artifacts directory
    const screenshotPath = 'C:/Users/H.I.N/.gemini/antigravity/brain/c6b23d0f-c230-4ce2-8a07-243753916c31/erp_live_screenshot.png';
    await erpPage.screenshot({ path: screenshotPath, fullPage: false });
    
    console.log(`Screenshot saved successfully to ${screenshotPath}`);
    await browser.disconnect();
  } catch (err: any) {
    console.error('Error connecting or capturing:', err);
  }
}

main();
