/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/chromium-handler.ts
let chromiumModule: any = null;

export async function getChromiumExecutablePath(): Promise<string> {
  // For local development
  if (process.env.NODE_ENV === 'development') {
    // Try common Chrome paths
    const commonPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      '/usr/bin/google-chrome-stable', // Linux
      '/usr/bin/google-chrome', // Linux
      '/usr/bin/chromium-browser', // Linux
    ];
    
    for (const path of commonPaths) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(path)) {
          return path;
        }
      } catch (_error) {
        continue;
      }
    }
    
    throw new Error('Chrome not found for local development. Please install Google Chrome.');
  }
  
  // For serverless (Vercel, AWS Lambda, etc.)
  try {
    if (!chromiumModule) {
      chromiumModule = await import('@sparticuz/chromium');
    }
    
    // Set up chromium for Lambda layer if available
    const isVercel = process.env.VERCEL === '1';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isVercel) {
      // Vercel-specific setup
      process.env.FONTCONFIG_PATH = '/tmp';
      process.env.XDG_DATA_HOME = '/tmp';
    }
    
    const executablePath = await chromiumModule.executablePath();
    
    if (!executablePath) {
      throw new Error('Chromium executable path is empty');
    }
    
    console.log('Chromium executable path:', executablePath);
    return executablePath;
    
  } catch (error) {
    console.error('Chromium setup failed:', error);
    throw new Error(`Chromium not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getChromiumArgs(): Promise<string[]> {
  try {
    if (!chromiumModule) {
      chromiumModule = await import('@sparticuz/chromium');
    }
    
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];
    
    // Add chromium-specific args if available
    if (chromiumModule.args) {
      return [...baseArgs, ...chromiumModule.args];
    }
    
    return baseArgs;
    
  } catch (_error) {
    console.warn('Could not load chromium args, using basic args');
    return [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
    ];
  }
}