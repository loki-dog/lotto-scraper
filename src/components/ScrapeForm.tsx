// src/components/ScrapeForm.tsx
'use client';

import { useState } from 'react';
import { LotteryResult, ScrapeResponse } from '@/lib/types';
import { convertToCSV, downloadCSV, generateFilename } from '@/lib/csv-export';

export default function ScrapeForm() {
  const [url, setUrl] = useState('https://www.thelott.com/oz-lotto/results');
  const [drawCount, setDrawCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [error, setError] = useState<string>('');

  const handleScrape = async () => {
    setIsLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          drawCount
        }),
      });

      const data: ScrapeResponse = await response.json();

      if (data.success && data.data) {
        setResults(data.data);
      } else {
        setError(data.error || 'Failed to scrape results');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Scrape error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleExportCSV = () => {
    if (results.length === 0) return;
    
    const csvContent = convertToCSV(results);
    const filename = generateFilename(url);
    downloadCSV(csvContent, filename);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white  rounded-lg shadow-md p-6">
        
        <form className="contact-form" onSubmit={(e) => { e.preventDefault(); handleScrape(); }}>
          <div className="form-group">
            <label htmlFor="url" className="form-label">
              Lottery Results URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.thelott.com/oz-lotto/results"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="drawCount" className="form-label">
              Number of Recent Draws
            </label>
            <div className="select-container">
              <select 
                id="drawCount"
                value={drawCount}
                onChange={(e) => setDrawCount(parseInt(e.target.value) || 1)}
                className="html-select"
              >
                <option value={1}>1 draw</option>
                <option value={5}>5 draws</option>
                <option value={10}>10 draws</option>
                <option value={15}>15 draws</option>
                <option value={20}>20 draws</option>
              </select>
              
              <div className="custom-select-wrapper">
                <div className="custom-select">
                  <div 
                    className="custom-select__trigger has-selection"
                    onClick={(e) => {
                      const select = e.currentTarget.closest('.custom-select');
                      select?.classList.toggle('open');
                    }}
                  >
                    <span>{drawCount} draw{drawCount !== 1 ? 's' : ''}</span>
                    <div className="arrow"></div>
                  </div>
                  <div className="custom-options">
                    {[1, 5, 10, 15, 20].map(count => (
                      <div 
                        key={count}
                        className="option-container"
                        onClick={() => {
                          setDrawCount(count);
                          const select = document.querySelector('.custom-select');
                          select?.classList.remove('open');
                        }}
                      >
                        <span className={`custom-option ${count === drawCount ? 'selected' : ''}`}>
                          {count} draw{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="form-hint">
              Choose how many recent lottery draws to extract
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading || !url}
              className="button-primary disabled:opacity-50 disabled:cursor-not-allowed "
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Scraping...
                </span>
              ) : (
                'Scrape Results'
              )}
            </button>

            {results.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Export CSV ({results.length} results)
              </button>
            )}
          </div>

          {error && (
            <div className="form-error bg-red-50 border border-red-200 rounded-md p-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Scraped Results ({results.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Draw #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Winning Numbers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Supplementary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Div 1 Prize
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {result.drawNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {result.drawDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex gap-1 flex-wrap">
                        {result.winningNumbers.map((num, i) => (
                          <span key={i} className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                            {num}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex gap-1 flex-wrap">
                        {result.supplementaryNumbers?.map((num, i) => (
                          <span key={i} className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-full">
                            {num}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {result.division1Prize}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}