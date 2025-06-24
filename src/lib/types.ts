export interface LotteryDraw {
  date: string;
  time: string;
  drawNumber: string;
  mainNumbers: number[];
  supplementaryNumbers: number[];
}

export interface ScrapingResult {
  success: boolean;
  draws: LotteryDraw[];
  error?: string;
}