// src/App.tsx
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { initGoogleAPI, loadFileFromDrive } from './utils/googleDriveAPI';
import { useProjectStore } from './store/useProjectStore';
import { Cloud } from 'lucide-react';

function App() {
  // 新增一個 'auth-wall' 狀態，用來擋住自動彈出視窗
  const [view, setView] = useState<'dashboard' | 'editor' | 'auth-wall'>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('初始化系統中...');
  const [targetFileId, setTargetFileId] = useState<string | null>(null);
  
  const { loadProjectData } = useProjectStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingMsg('連線至 Google 服務...');
        await initGoogleAPI();

        const params = new URLSearchParams(window.location.search);
        const fileId = params.get('fileId');
        
        if (fileId) {
          // 發現網址有 fileId，但不要自動載入，而是把使用者導向授權大門
          setTargetFileId(fileId);
          setView('auth-wall');
        }
      } catch (error) {
        console.error('初始化失敗:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // 使用者點擊按鈕後，才真正去呼叫 Google 登入與讀取檔案
  const handleManualLoad = async () => {
    if (!targetFileId) return;
    setIsInitializing(true);
    setLoadingMsg('等待 Google 授權與讀取檔案...');
    try {
      const data = await loadFileFromDrive(targetFileId);
      loadProjectData({ ...data, fileId: targetFileId });
      setView('editor');
    } catch (error) {
      console.error(error);
      alert('讀取失敗！請確認您是否有權限開啟此檔案，或該檔案已被刪除。');
      setView('dashboard');
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="font-bold">{loadingMsg}</p>
      </div>
    );
  }

  // 授權大門畫面 (長官專屬)
  if (view === 'auth-wall') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border border-slate-100">
            <div className="flex justify-center mb-6">
               <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                  <Cloud size={40} />
               </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-slate-800">載入雲端專案</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
               您正在嘗試開啟一份雲端排位檔案。<br/>
               為了驗證您的存取權限，請點擊下方按鈕登入 Google 帳號。
            </p>
            <button 
              onClick={handleManualLoad} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md w-full"
            >
              授權並開啟檔案
            </button>
            <button 
              onClick={() => setView('dashboard')} 
              className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition"
            >
              取消並返回首頁
            </button>
         </div>
      </div>
    );
  }

  return view === 'dashboard' ? (
    <Dashboard onEnter={() => setView('editor')} />
  ) : (
    <Layout />
  );
}

export default App;