"use client";
import React, { useState } from 'react';
import { LotteryDraw } from './types';

const LotteryScraper: React.FC = () => {
  const [url, setUrl] = useState('https://www.oz.lotterywest.com/saturday-lotto/results');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LotteryDraw[]>([]);
  const [error, setError] = useState<string>('');

   const parseHTML = (html: string): LotteryDraw[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const drawElements = doc.querySelectorAll('.css-cz3i0m-Results');
    
    const draws: LotteryDraw[] = [];

    drawElements.forEach((element) => {
      try {
        // Extract date and time more carefully
        const h4Element = element.querySelector('h4');
        if (!h4Element) return;

        // Clone the h4 element to manipulate it without affecting the original
        const h4Clone = h4Element.cloneNode(true) as HTMLElement;
        
        // Remove the draw number link/span to get clean date/time
        const drawNumberSpan = h4Clone.querySelector('.css-1hamhgj-DrawNumber');
        if (drawNumberSpan) {
          drawNumberSpan.remove();
        }
        
        // Remove any remaining anchor tags
        const anchorTags = h4Clone.querySelectorAll('a');
        anchorTags.forEach(anchor => anchor.remove());
        
        // Get clean date/time text
        let dateTimeText = h4Clone.textContent || '';
        
        // Clean up any CSS artifacts or extra whitespace
        dateTimeText = dateTimeText
          .replace(/css-[a-zA-Z0-9-]+/g, '') // Remove CSS class references
          .replace(/\{[^}]+\}/g, '') // Remove any CSS-like content
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Split by non-breaking space or regular space, then by time indicators
        let datePart = '';
        let timePart = '';
        
        // Look for common time patterns (e.g., "10:00 am", "8:00 pm")
        const timeMatch = dateTimeText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
        if (timeMatch) {
          timePart = timeMatch[1].trim();
          datePart = dateTimeText.replace(timeMatch[0], '').trim();
        } else {
          // Fallback: split by non-breaking space
          const parts = dateTimeText.split(/[\u00A0\s]+/);
          if (parts.length >= 2) {
            datePart = parts.slice(0, -2).join(' ').trim(); // Everything except last 2 parts
            timePart = parts.slice(-2).join(' ').trim(); // Last 2 parts (time)
          } else {
            datePart = dateTimeText;
          }
        }
        
        // Extract draw number from the styled span (the boxed version)
        const drawNumberElement = element.querySelector('.css-1hamhgj-DrawNumber');
        const drawNumber = drawNumberElement?.textContent?.replace('Draw ', '') || '';

        // Extract main numbers
        const mainNumberElements = element.querySelectorAll('.results-number-set__number--ns1');
        const mainNumbers: number[] = [];
        mainNumberElements.forEach(el => {
          const num = parseInt(el.textContent || '0', 10);
          if (!isNaN(num)) mainNumbers.push(num);
        });

        // Extract supplementary numbers
        const suppNumberElements = element.querySelectorAll('.results-number-set__number--ns2');
        const supplementaryNumbers: number[] = [];
        suppNumberElements.forEach(el => {
          const num = parseInt(el.textContent || '0', 10);
          if (!isNaN(num)) supplementaryNumbers.push(num);
        });

        // Only add if we have the essential data
        if (datePart && drawNumber && mainNumbers.length > 0) {
          draws.push({
            date: datePart,
            time: timePart,
            drawNumber: drawNumber.trim(),
            mainNumbers,
            supplementaryNumbers
          });
        }
      } catch (err) {
        console.error('Error parsing draw element:', err);
      }
    });

    return draws;
  };
  // const parseHTML = (html: string): LotteryDraw[] => {
  //   const parser = new DOMParser();
  //   const doc = parser.parseFromString(html, 'text/html');
  //   const drawElements = doc.querySelectorAll('.css-cz3i0m-Results');
    
  //   const draws: LotteryDraw[] = [];

  //   drawElements.forEach((element) => {
  //     try {
  //       // Extract date and time
  //       const h4Element = element.querySelector('h4');
  //       const dateTimeText = h4Element?.textContent || '';
  //       const [datePart, timePart] = dateTimeText.split('\u00A0'); // Split on non-breaking space
        
  //       // Extract draw number
  //       const drawNumberElement = element.querySelector('.css-1hamhgj-DrawNumber');
  //       const drawNumber = drawNumberElement?.textContent?.replace('Draw ', '') || '';

  //       // Extract main numbers
  //       const mainNumberElements = element.querySelectorAll('.results-number-set__number--ns1');
  //       const mainNumbers: number[] = [];
  //       mainNumberElements.forEach(el => {
  //         const num = parseInt(el.textContent || '0', 10);
  //         if (!isNaN(num)) mainNumbers.push(num);
  //       });

  //       // Extract supplementary numbers
  //       const suppNumberElements = element.querySelectorAll('.results-number-set__number--ns2');
  //       const supplementaryNumbers: number[] = [];
  //       suppNumberElements.forEach(el => {
  //         const num = parseInt(el.textContent || '0', 10);
  //         if (!isNaN(num)) supplementaryNumbers.push(num);
  //       });

  //       if (datePart && drawNumber && mainNumbers.length > 0) {
  //         draws.push({
  //           date: datePart.trim(),
  //           time: timePart?.trim() || '',
  //           drawNumber: drawNumber.trim(),
  //           mainNumbers,
  //           supplementaryNumbers
  //         });
  //       }
  //     } catch (err) {
  //       console.error('Error parsing draw element:', err);
  //     }
  //   });

  //   return draws;
  // };

  const handleScrape = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to scrape lottery results');
      }

      const parsedDraws = parseHTML(data.html);
      
      if (parsedDraws.length === 0) {
        throw new Error('No lottery draws found on the page');
      }

      setResults(parsedDraws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Date',
      'Time',
      'Draw Number',
      'Main Numbers',
      'Supplementary Numbers'
    ];

    const csvContent = [
      headers.join(','),
      ...results.map(draw => [
        `"${draw.date}"`,
        `"${draw.time}"`,
        `"${draw.drawNumber}"`,
        `"${draw.mainNumbers.join(', ')}"`,
        `"${draw.supplementaryNumbers.join(', ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `lottery-results-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-accent-800 mb-6">Dad&apos;s Results Scraper</h1>
      
      <div className="mb-6">
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          Lottery Results URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-accent-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
          placeholder="Enter lottery results URL"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleScrape}
          disabled={loading || !url}
          className="px-6 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Scraping...' : 'Scrape Results'}
        </button>
        
        {results.length > 0 && (
          <button
            onClick={exportToCSV}
            className="px-6 py-2 bg-contrast-600 text-white rounded-md hover:bg-contrast-700"
          >
            Export to CSV ({results.length} draws)
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Found {results.length} Draw{results.length !== 1 ? 's' : ''}
          </h2>
          
          <div className="grid gap-4">
            {results.map((draw, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">
                    {draw.date} {draw.time}
                  </h3>
                  <span className="bg-accent-100 text-accent-800 px-2 py-1 rounded text-sm">
                    Draw {draw.drawNumber}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Main Numbers</h4>
                    <div className="flex gap-2">
                      {draw.mainNumbers.map((num, idx) => (
                        <span key={idx} className="w-8 h-8 bg-accent-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {draw.supplementaryNumbers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-1">Supplementary Numbers</h4>
                      <div className="flex gap-2">
                        {draw.supplementaryNumbers.map((num, idx) => (
                          <span key={idx} className="w-8 h-8 bg-contrast-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryScraper;