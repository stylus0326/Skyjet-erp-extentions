import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

const testCases = [
  {
    pnr: 'D6V64X',
    candidates: ['SAI', 'HUNG', 'VAN', 'SAI VAN HUNG', 'SAIVANHUNG', 'MR']
  },
  {
    pnr: 'DMDAHD',
    candidates: ['NGUYEN', 'HANG', 'THANH', 'NGUYEN THANH HANG', 'NGUYENTHANHHANG', 'MRS']
  },
  {
    pnr: 'DD5PSX',
    candidates: ['SAI', 'HUNG', 'VAN', 'SAI VAN HUNG', 'SAIVANHUNG', 'MR']
  }
];

async function main() {
  let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(executablePath)) {
    executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  }
  
  console.log('Launching browser with path:', executablePath);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    
    console.log('Visiting Vietnam Airlines homepage to set cookies...');
    await page.goto('https://www.vietnamairlines.com/vn/vi/', { waitUntil: 'networkidle2' });

    for (const testCase of testCases) {
      console.log(`\n=========================================`);
      console.log(`Testing PNR ${testCase.pnr}`);
      console.log(`=========================================`);
      
      for (const name of testCase.candidates) {
        console.log(`Testing with last name: ${name}`);
        const url = `https://integration-middleware-website.vietnamairlines.com/api/v1/public/reservation/pnr/${testCase.pnr}?lastName=${name}`;
        
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
            return { status: -1, body: (e as Error).message };
          }
        }, url);

        console.log('Status:', responseText.status);
        if (responseText.status === 200) {
          console.log('SUCCESS!');
          console.log('Body snippet:', responseText.body.substring(0, 1000));
          try {
            const json = JSON.parse(responseText.body);
            console.log('Passengers in response:', json.reservation?.passengers?.map((p: any) => `${p.firstName} ${p.lastName}`));
          } catch (err) {
            console.log('Failed to parse json:', (err as Error).message);
          }
          break; // Stop testing other candidates for this PNR if successful
        } else {
          console.log('Body snippet:', responseText.body.substring(0, 300));
        }
      }
    }
  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main().catch(console.error);

