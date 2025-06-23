// src/lib/csv-export.ts
import { LotteryResult } from './types';

export function convertToCSV(results: LotteryResult[]): string {
  if (results.length === 0) return '';

  // Define CSV headers
  const headers = [
    'Draw Number',
    'Draw Date',
    'Winning Numbers',
    'Supplementary Numbers',
    'Division 1 Winners',
    'Division 1 Prize',
    'Total Prize Pool'
  ];

  // Convert results to CSV rows
  const rows = results.map(result => [
    result.drawNumber.toString(),
    result.drawDate,
    result.winningNumbers.join(' '),
    result.supplementaryNumbers?.join(' ') || '',
    result.division1Winners?.toString() || '',
    result.division1Prize || '',
    result.totalPrizePool || ''
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string = 'lottery-results.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function generateFilename(baseUrl: string): string {
  const date = new Date().toISOString().split('T')[0];
  const siteName = new URL(baseUrl).hostname.replace('www.', '').replace('.com', '');
  return `${siteName}-lottery-results-${date}.csv`;
}