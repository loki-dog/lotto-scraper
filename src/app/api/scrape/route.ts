// src/app/api/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LotteryScraper } from '@/lib/scraper';
import { ScrapeRequest, ScrapeResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();
    const { url, drawCount = 10 } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      } as ScrapeResponse, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL provided'
      } as ScrapeResponse, { status: 400 });
    }

    console.log('Starting scrape for URL:', url, 'drawCount:', drawCount);

    const scraper = new LotteryScraper();
    
    let results;
    try {
      // First try the optimized method
      if (url.includes('thelott.com') && url.includes('oz-lotto')) {
        results = await scraper.scrapeOzLotto(url, drawCount);
      } else {
        results = await scraper.scrapeOzLotto(url, drawCount);
      }
    } catch (error) {
      console.log('Primary scraping method failed, trying safe fallback:', error);
      
      // If the optimized method fails, try the safe method
      try {
        results = await scraper.scrapeOzLottoSafe(url, drawCount);
      } catch (fallbackError) {
        await scraper.closeBrowser();
        throw fallbackError;
      }
    }

    await scraper.closeBrowser();

    console.log('Scraping completed. Found', results.length, 'results');

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length
    } as ScrapeResponse);

  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as ScrapeResponse, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Lottery Scraper API',
    endpoints: {
      POST: '/api/scrape - Scrape lottery results',
    },
    example: {
      url: 'https://www.thelott.com/oz-lotto/results',
      drawCount: 5
    }
  });
}