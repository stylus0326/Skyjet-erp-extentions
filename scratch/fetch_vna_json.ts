import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(executablePath)) {
    executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  }
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.vietnamairlines.com/vn/vi/', { waitUntil: 'networkidle2' });

    const pnr = 'DD5PSX';
    const lastName = 'SAI';
    const url = `https://integration-middleware-website.vietnamairlines.com/api/v1/public/reservation/pnr/${pnr}?lastName=${lastName}`;
    
    const responseText = await page.evaluate(async (fetchUrl) => {
      try {
        const res = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'lang': 'vi',
            'referer': 'https://www.vietnamairlines.com/',
            'origin': 'https://www.vietnamairlines.com'
          }
        });
        return {
          status: res.status,
          body: await res.text()
        };
      } catch (e) {
        return { status: -1, body: e.message };
      }
    }, url);

    console.log('Status:', responseText.status);
    if (responseText.status === 200) {
      fs.writeFileSync('C:\\Users\\H.I.N\\.gemini\\antigravity\\brain\\111b2c1f-8a1a-4b02-858e-8e863f970f8d\\scratch\\dd5psx_response.json', responseText.body);
      console.log('Saved response to dd5psx_response.json');
    }
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
