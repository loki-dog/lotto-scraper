import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Try direct fetch with comprehensive headers
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (contentType && contentType.includes('application/json')) {
      // If it's JSON, parse it
      const jsonData = await response.json();
      return NextResponse.json({ html: JSON.stringify(jsonData), isJson: true });
    } else {
      // If it's HTML, return as text
      const html = await response.text();
      console.log('HTML length:', html.length);
      console.log('HTML preview:', html.substring(0, 200));
      
      return NextResponse.json({ html, isJson: false });
    }
  } catch (error) {
    console.error('Scraping error:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: 'Failed to fetch lottery results',
      error: errorMessage,
      suggestion: 'The website may be blocking automated requests. Try using a CORS proxy service or manual HTML input.'
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}