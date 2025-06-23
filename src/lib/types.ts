// src/lib/types.ts
export interface LotteryResult {
  drawNumber: number;
  drawDate: string;
  winningNumbers: number[];
  supplementaryNumbers?: number[];
  division1Winners?: number;
  division1Prize?: string;
  totalPrizePool?: string;
}

export interface ScrapeRequest {
  url: string;
  drawCount?: number; // How many recent draws to scrape
}

export interface ScrapeResponse {
  success: boolean;
  data?: LotteryResult[];
  error?: string;
  count?: number;
}