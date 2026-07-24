const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.goto('https://www.tuttocampo.it/Campania/AllieviRegionaliU16/GironeH/Classifica', {
    waitUntil: 'networkidle2', timeout: 30000
  });

  // Dump HTML to inspect structure
  const html = await page.content();
  // Find all img srcs that look like team logos
  const imgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src || img.dataset.src,
      alt: img.alt,
      className: img.className
    })).filter(i => i.src && !i.src.includes('data:'));
  });

  console.log('=== ALL IMGS ===');
  console.log(JSON.stringify(imgs, null, 2));
  
  // Also check for data-src (lazy loaded)
  const lazySrcs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-src]')).map(el => ({
      dataSrc: el.dataset.src,
      alt: el.alt,
      tag: el.tagName
    }));
  });
  console.log('=== LAZY IMGS ===');
  console.log(JSON.stringify(lazySrcs, null, 2));
  await browser.close();
})();
