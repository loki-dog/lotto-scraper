/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/scraper.ts
import puppeteer, { Browser } from 'puppeteer-core';
import { promises as fs } from 'fs';
import { LotteryResult } from './types';
import { getChromiumExecutablePath, getChromiumArgs } from './chromium-handler';

export class LotteryScraper {
  private browser: Browser | null = null;

  private async getExecutablePath(): Promise<string> {
    return await getChromiumExecutablePath();
  }

  private async checkFileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async getLocalChromePath(): Promise<string> {
    // Check environment variable first
    if (process.env.CHROME_EXECUTABLE_PATH) {
      return process.env.CHROME_EXECUTABLE_PATH;
    }

    // Try to find Chrome executable path based on the platform
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows paths
      const windowsPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      ];
      
      for (const path of windowsPaths) {
        if (await this.checkFileExists(path)) {
          return path;
        }
      }
    } else if (platform === 'darwin') {
      // macOS paths
      const macPaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ];
      
      for (const path of macPaths) {
        if (await this.checkFileExists(path)) {
          return path;
        }
      }
    } else {
      // Linux paths
      const linuxPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ];
      
      for (const path of linuxPaths) {
        if (await this.checkFileExists(path)) {
          return path;
        }
      }
    }
    
    throw new Error('Chrome executable not found. Please install Google Chrome or set CHROME_EXECUTABLE_PATH environment variable.');
  }

  async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      const executablePath = await this.getExecutablePath();
      const args = await getChromiumArgs();
      
      this.browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args,
        defaultViewport: { width: 1280, height: 720 },
        ignoreDefaultArgs: ['--disable-extensions'],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeOzLotto(url: string, drawCount: number = 5): Promise<LotteryResult[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      console.log('Navigating to:', url);
      
      // More selective resource blocking to avoid breaking the page
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        const reqUrl = req.url();
        
        // Only block non-essential resources, but allow critical ones
        if (resourceType === 'image' && !reqUrl.includes('icon')) {
          req.abort();
        } else if (resourceType === 'font') {
          req.abort();
        } else if (resourceType === 'media') {
          req.abort();
        } else if (resourceType === 'stylesheet' && reqUrl.includes('analytics')) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      await page.goto(url, { 
        waitUntil: 'networkidle0', // Wait for network to be mostly idle
        timeout: 25000
      });
      
      // Wait for the page to be interactive
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
      
      // Wait for the specific elements we need with retry logic
      console.log('Waiting for lottery results to load...');
      
      let elementsFound = false;
      let retries = 3;
      
      while (!elementsFound && retries > 0) {
        try {
          await page.waitForSelector('[data-test-id="winning-number"]', { timeout: 5000 });
          elementsFound = true;
          console.log('Found lottery result elements');
        } catch (_error) {
          retries--;
          console.log(`Retry ${3 - retries}/3: Waiting for elements...`);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!elementsFound) {
        throw new Error('Could not find lottery result elements after multiple attempts');
      }
      
      // Try to load more draws by clicking navigation if needed
      console.log('Checking for additional draws...');
      try {
        // Look for "previous draw" buttons and click them to load more results
        const prevButtons = await page.$('[data-test-id="prev-draw"]');
        
        if (prevButtons && drawCount > 1) {
          // Click previous draw buttons to load more historical results
          for (let i = 0; i < Math.min(drawCount - 1, 10); i++) { // Limit to 10 clicks max
            try {
              // Find enabled previous buttons
              const enabledPrevButton = await page.$('[data-test-id="prev-draw"] .arrow.enabled');
              if (enabledPrevButton) {
                await enabledPrevButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for new content to load
                console.log(`Loaded additional draw ${i + 1}`);
              } else {
                console.log('No more previous draws available');
                break;
              }
            } catch (clickError) {
              console.log('Could not click previous draw button:', clickError);
              break;
            }
          }
        }
      } catch (navError) {
        console.log('Navigation loading failed, continuing with available draws:', navError);
      }
      
      // Small wait to ensure all dynamic content is loaded
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Extracting lottery results...');
      
      const results = await page.evaluate((maxCount: number) => {
        const extractedResults: any[] = [];
        
        // Find all draw containers - each draw has a header and body
        const drawContainers = document.querySelectorAll('.product-result');
        
        console.log('Found', drawContainers.length, 'draw containers');
        
        for (let i = 0; i < Math.min(drawContainers.length, maxCount); i++) {
          const container = drawContainers[i];
          
          try {
            // Process ALL results, including hidden ones - they contain valid data
            
            // Extract draw number from header
            const drawNumberElement = container.querySelector('.drawname h3');
            const drawNumberText = drawNumberElement?.textContent?.trim() || '';
            const drawNumberMatch = drawNumberText.match(/Draw No\. (\d+)/);
            const drawNumber = drawNumberMatch ? parseInt(drawNumberMatch[1]) : 0;
            
            // Extract draw date
            const drawDateElement = container.querySelector('.drawdate span');
            const drawDate = drawDateElement?.textContent?.trim() || '';
            
            // Extract winning numbers
            const winningNumberElements = container.querySelectorAll('[data-test-id="winning-number"]');
            const winningNumbers: number[] = [];
            
            winningNumberElements.forEach(el => {
              const numberText = el.textContent?.trim();
              if (numberText) {
                const num = parseInt(numberText);
                if (!isNaN(num) && num > 0) {
                  winningNumbers.push(num);
                }
              }
            });
            
            // Extract supplementary numbers
            const suppNumberElements = container.querySelectorAll('[data-test-id="supps-number"]');
            const supplementaryNumbers: number[] = [];
            
            suppNumberElements.forEach(el => {
              const numberText = el.textContent?.trim();
              if (numberText) {
                const num = parseInt(numberText);
                if (!isNaN(num) && num > 0) {
                  supplementaryNumbers.push(num);
                }
              }
            });
            
            // Extract Division 1 prize information
            const divisionRows = container.querySelectorAll('[data-test-id="division-row"]');
            let division1Prize = '';
            let division1Winners = 0;
            
            if (divisionRows.length > 0) {
              // First row should be Division 1
              const div1Row = divisionRows[0];
              const prizeElement = div1Row.querySelector('td:nth-child(2) div');
              division1Prize = prizeElement?.textContent?.trim() || '';
              
              const winnersElement = div1Row.querySelector('td:nth-child(4)');
              const winnersText = winnersElement?.textContent?.trim() || '0';
              division1Winners = parseInt(winnersText) || 0;
            }
            
            // Only add if we have valid data
            if (drawNumber > 0 && drawDate && winningNumbers.length >= 6) {
              extractedResults.push({
                drawNumber,
                drawDate,
                winningNumbers: winningNumbers.slice(0, 7), // Ensure max 7 numbers
                supplementaryNumbers: supplementaryNumbers.length > 0 ? supplementaryNumbers.slice(0, 3) : undefined,
                division1Winners: division1Winners || undefined,
                division1Prize: division1Prize || undefined
              });
              
              console.log(`Extracted draw ${drawNumber}: ${winningNumbers.join(', ')} + ${supplementaryNumbers.join(', ')}`);
            } else {
              console.log(`Skipped draw ${i} - insufficient data: drawNumber=${drawNumber}, drawDate='${drawDate}', winningNumbers=${winningNumbers.length}`);
            }
          } catch (error) {
            console.error('Error extracting draw', i, ':', error);
          }
        }
        
        console.log('Total extracted results:', extractedResults.length);
        return extractedResults;
      }, drawCount);

      if (results.length === 0) {
        throw new Error('No lottery results could be extracted. The page structure may have changed.');
      }

      console.log(`Successfully extracted ${results.length} lottery results`);
      return results;
      
    } catch (error) {
      console.error('Scraping error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Protocol error')) {
          throw new Error('Page loading failed - the website may be blocking automated access. Try again in a few minutes.');
        } else if (error.message.includes('Timeout')) {
          throw new Error('The page took too long to load. The website may be slow or down.');
        } else {
          throw new Error(`Scraping failed: ${error.message}`);
        }
      } else {
        throw new Error('An unknown error occurred during scraping');
      }
    } finally {
      await page.close();
    }
  }

  // Alternative scraping method without resource blocking
  async scrapeOzLottoSafe(url: string, drawCount: number = 5): Promise<LotteryResult[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      console.log('Using safe scraping method for:', url);
      
      // No resource blocking - let everything load
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for the specific elements we need
      console.log('Waiting for lottery results to load...');
      await page.waitForSelector('[data-test-id="winning-number"]', { timeout: 15000 });
      
      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Extracting lottery results...');
      
      const results = await page.evaluate((maxCount: number) => {
        const extractedResults: any[] = [];
        
        // Find all draw containers
        const drawContainers = document.querySelectorAll('.product-result');
        console.log('Found', drawContainers.length, 'draw containers');
        
        for (let i = 0; i < Math.min(drawContainers.length, maxCount); i++) {
          const container = drawContainers[i];
          
          try {
            // Process ALL results, including hidden ones - they contain valid data
            
            // Extract draw number
            const drawNumberElement = container.querySelector('.drawname h3');
            const drawNumberText = drawNumberElement?.textContent?.trim() || '';
            const drawNumberMatch = drawNumberText.match(/Draw No\. (\d+)/);
            const drawNumber = drawNumberMatch ? parseInt(drawNumberMatch[1]) : 0;
            
            // Extract draw date
            const drawDateElement = container.querySelector('.drawdate span');
            const drawDate = drawDateElement?.textContent?.trim() || '';
            
            // Extract winning numbers
            const winningNumberElements = container.querySelectorAll('[data-test-id="winning-number"]');
            const winningNumbers: number[] = [];
            
            winningNumberElements.forEach(el => {
              const numberText = el.textContent?.trim();
              if (numberText) {
                const num = parseInt(numberText);
                if (!isNaN(num) && num > 0) {
                  winningNumbers.push(num);
                }
              }
            });
            
            // Extract supplementary numbers
            const suppNumberElements = container.querySelectorAll('[data-test-id="supps-number"]');
            const supplementaryNumbers: number[] = [];
            
            suppNumberElements.forEach(el => {
              const numberText = el.textContent?.trim();
              if (numberText) {
                const num = parseInt(numberText);
                if (!isNaN(num) && num > 0) {
                  supplementaryNumbers.push(num);
                }
              }
            });
            
            // Extract Division 1 prize information
            const divisionRows = container.querySelectorAll('[data-test-id="division-row"]');
            let division1Prize = '';
            let division1Winners = 0;
            
            if (divisionRows.length > 0) {
              const div1Row = divisionRows[0];
              const prizeElement = div1Row.querySelector('td:nth-child(2) div');
              division1Prize = prizeElement?.textContent?.trim() || '';
              
              const winnersElement = div1Row.querySelector('td:nth-child(4)');
              const winnersText = winnersElement?.textContent?.trim() || '0';
              division1Winners = parseInt(winnersText) || 0;
            }
            
            // Only add if we have valid data
            if (drawNumber > 0 && drawDate && winningNumbers.length >= 6) {
              extractedResults.push({
                drawNumber,
                drawDate,
                winningNumbers: winningNumbers.slice(0, 7),
                supplementaryNumbers: supplementaryNumbers.length > 0 ? supplementaryNumbers.slice(0, 3) : undefined,
                division1Winners: division1Winners || undefined,
                division1Prize: division1Prize || undefined
              });
            }
          } catch (error) {
            console.error('Error extracting draw', i, ':', error);
          }
        }
        
        return extractedResults;
      }, drawCount);

      if (results.length === 0) {
        throw new Error('No lottery results could be extracted');
      }

      return results;
    } finally {
      await page.close();
    }
  }
}