// Test script to verify Puppeteer configuration
// Run with: NODE_ENV=production ts-node test-puppeteer-config.ts

async function testPuppeteerConfig() {
  console.log('🧪 Testing Puppeteer Configuration...\n');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`📌 NODE_ENV: ${nodeEnv}`);
  console.log(`📌 Is Production: ${nodeEnv === 'production'}\n`);
  
  try {
    if (nodeEnv === 'production') {
      console.log('✅ Production mode detected');
      console.log('📦 Loading @sparticuz/chromium...');
      
      const { default: Chromium } = await import('@sparticuz/chromium');
      console.log('✅ @sparticuz/chromium loaded');
      
      console.log('📦 Loading puppeteer-core...');
      const puppeteer = await import('puppeteer-core');
      console.log('✅ puppeteer-core loaded');
      
      console.log('🚀 Getting Chromium executable path...');
      const executablePath = await Chromium.executablePath();
      console.log(`✅ Executable path: ${executablePath}`);
      
      console.log('🚀 Launching browser...');
      const browser = await puppeteer.launch({
        headless: 'shell',
        args: [
          ...Chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        executablePath,
      });
      
      console.log('✅ Browser launched successfully');
      console.log(`📊 Browser version: ${await browser.version()}`);
      
      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
      const pdf = await page.pdf({ format: 'A4' });
      
      console.log(`✅ PDF generated successfully (${pdf.length} bytes)`);
      
      await browser.close();
      console.log('✅ Browser closed');
      
    } else {
      console.log('✅ Development mode detected');
      console.log('📦 Loading puppeteer...');
      
      const puppeteer = await import('puppeteer');
      console.log('✅ puppeteer loaded');
      
      console.log('🚀 Launching browser...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      console.log('✅ Browser launched successfully');
      console.log(`📊 Browser version: ${await browser.version()}`);
      
      const page = await browser.newPage();
      await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
      const pdf = await page.pdf({ format: 'A4' });
      
      console.log(`✅ PDF generated successfully (${pdf.length} bytes)`);
      
      await browser.close();
      console.log('✅ Browser closed');
    }
    
    console.log('\n✨ All tests passed! PDF generation should work correctly.');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔍 Full error:', error);
    process.exit(1);
  }
}

testPuppeteerConfig().catch(console.error);
