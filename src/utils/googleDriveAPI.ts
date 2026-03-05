// src/utils/googleDriveAPI.ts

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// 因為是內部系統，我們申請完整的 drive 權限，確保長官透過網址能直接讀取您共用的檔案
const SCOPES = 'https://www.googleapis.com/auth/drive'; 

// 宣告全域變數避免 TypeScript 報錯 (不需額外 npm install types)
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any = null;
let accessToken: string | null = null;

/**
 * 步驟一：初始化 Google API (載入必要的外部腳本)
 */
export const initGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.google) {
      resolve();
      return;
    }

    const loadGapi = new Promise<void>((res) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client:picker', {
          callback: async () => {
            await window.gapi.client.init({ apiKey: API_KEY });
            res();
          },
        });
      };
      document.body.appendChild(script);
    });

    const loadGsi = new Promise<void>((res) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (resp: any) => {
            if (resp.error) {
              console.error('登入失敗:', resp);
              return;
            }
            accessToken = resp.access_token;
          },
        });
        res();
      };
      document.body.appendChild(script);
    });

    Promise.all([loadGapi, loadGsi]).then(() => resolve()).catch(reject);
  });
};

/**
 * 步驟二：呼叫登入視窗 (取得 Token)
 */
export const requireLogin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (accessToken) {
      resolve(accessToken);
      return;
    }
    if (!tokenClient) {
      reject('Google API 尚未初始化');
      return;
    }
    // 覆寫 callback 來捕捉這次登入的 token
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp.error);
        return;
      }
      accessToken = resp.access_token;
      resolve(resp.access_token);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * 步驟三：呼叫 Google Drive Picker (選檔器)
 */
export const showDrivePicker = async (): Promise<{ id: string; name: string } | null> => {
  const token = await requireLogin();
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('application/json'); // 只顯示 JSON 檔

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const file = data.docs[0];
          resolve({ id: file.id, name: file.name });
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();
    picker.setVisible(true);
  });
};

/**
 * 步驟四：從雲端讀取 JSON 檔案內容
 */
export const loadFileFromDrive = async (fileId: string): Promise<any> => {
  const token = await requireLogin();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('無法讀取檔案，可能無權限或檔案不存在');
  return await response.json();
};

/**
 * 步驟五：存檔到雲端 (若是新專案則建立新檔，若有 fileId 則覆蓋舊檔)
 */
export const saveFileToDrive = async (fileName: string, data: any, existingFileId?: string): Promise<string> => {
  const token = await requireLogin();
  const fileContent = JSON.stringify(data);
  const metadata = {
    name: `${fileName}.json`,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const url = existingFileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart` // 更新現有檔案
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';                  // 建立新檔案

  const method = existingFileId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  if (!response.ok) throw new Error('存檔失敗');
  const result = await response.json();
  return result.id; // 回傳檔案的 Google Drive ID
};