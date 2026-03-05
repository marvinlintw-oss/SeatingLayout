// src/utils/venueIO.ts
import type { Seat } from '../types';

export interface VenueConfig {
  seats: Seat[];
  backgroundImage: string | null;
  type: string;
  version: string;
}

/**
 * 將場地設定匯出為專屬的 .seatvenue 檔案
 */
export const exportVenueLocal = (seats: Seat[], backgroundImage: string | null, sessionName: string) => {
  const data: VenueConfig = { seats, backgroundImage, type: 'venue-only', version: '4.0' };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // 【關鍵】使用專屬副檔名，避免與專案檔混淆
  link.download = `${sessionName}-場地佈局.seatvenue`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 讀取並解析 .seatvenue 場地檔案
 */
export const importVenueLocal = (file: File): Promise<VenueConfig> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json.seats)) throw new Error('Invalid Format');
        resolve(json as VenueConfig);
      } catch (err) {
        reject(new Error('匯入失敗：場地格式錯誤或檔案損毀'));
      }
    };
    reader.onerror = () => reject(new Error('瀏覽器讀取檔案發生錯誤'));
    reader.readAsText(file);
  });
};