// src/components/Header/TopNavBar.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { saveFileToDrive, showDrivePicker, loadFileFromDrive } from '../../utils/googleDriveAPI';
import { Cloud, Settings, CheckCircle, FolderOpen, Copy } from 'lucide-react';
import { CategoryModal } from '../Modals/CategoryModal';

export const TopNavBar: React.FC = () => {
  const { projectName, setProjectName, fileId, setFileId, loadProjectData } = useProjectStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 共用的存檔邏輯引擎 (支援 null 與 undefined)
  const performSave = async (targetFileId: string | null | undefined, targetName: string) => {
    setIsProcessing(true);
    setSaveStatus('idle');
    try {
      const state = useProjectStore.getState();
      const projectDataToSave = {
        version: state.version,
        timestamp: new Date().toISOString(),
        fileId: targetFileId || null,
        projectName: targetName,
        personnel: state.personnel,
        categories: state.categories,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      };

      // 【修復】將 null 轉為 undefined 以符合 API 型別要求
      const idToPass = targetFileId || undefined; 
      const savedFileId = await saveFileToDrive(targetName, projectDataToSave, idToPass);
      
      // 如果是另存新檔或是第一次存檔，更新網址與 fileId
      if (targetFileId !== savedFileId && savedFileId) {
        setFileId(savedFileId);
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${savedFileId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      alert('存檔失敗，請確認網路連線或登入狀態！');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. 儲存 (覆蓋原檔)
  const handleSave = () => performSave(fileId, projectName);

  // 2. 另存新檔 (強制新建)
  const handleSaveAs = () => {
    const newName = window.prompt('請輸入新專案名稱：', `${projectName} (複製)`);
    if (!newName) return;
    setProjectName(newName);
    // 傳入 undefined 迫使系統建立全新的 Google Drive 檔案
    performSave(undefined, newName); 
  };

  // 3. 載入雲端檔案
  const handleLoad = async () => {
    try {
      setIsProcessing(true);
      const pickedFile = await showDrivePicker();
      if (pickedFile) {
        const data = await loadFileFromDrive(pickedFile.id);
        loadProjectData({ ...data, fileId: pickedFile.id });
        
        // 更新網址列，方便長官複製分享
        const newUrl = `${window.location.origin}${window.location.pathname}?fileId=${pickedFile.id}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
    } catch (error) {
      console.error(error);
      alert('讀取檔案失敗！');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="h-14 bg-slate-800 text-white flex items-center justify-between px-4 shadow-md shrink-0">
        
        {/* 左側：專案名稱 */}
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg tracking-wide text-blue-300">SeatSystem v4.0</div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-slate-700/50 hover:bg-slate-700 focus:bg-slate-600 text-white px-3 py-1.5 rounded outline-none transition w-64 font-medium"
            placeholder="輸入專案名稱..."
          />
        </div>

        {/* 右側：雲端工具列 */}
        <div className="flex items-center gap-2">
          {fileId && <span className="text-xs text-slate-400 mr-2">已連線至雲端</span>}
          
          {/* 載入按鈕 */}
          <button 
            onClick={handleLoad} disabled={isProcessing}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
          >
            <FolderOpen size={16} className="text-amber-400" /> 載入
          </button>

          {/* 儲存按鈕 */}
          <button 
            onClick={handleSave} disabled={isProcessing}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded transition font-bold shadow-sm disabled:opacity-50
              ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}
            `}
          >
            {isProcessing ? (
              <span className="animate-pulse">處理中...</span>
            ) : saveStatus === 'success' ? (
              <><CheckCircle size={16} /> 成功</>
            ) : (
              <><Cloud size={16} /> 儲存</>
            )}
          </button>

          {/* 另存新檔 */}
          <button 
            onClick={handleSaveAs} disabled={isProcessing}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 ml-1"
          >
            <Copy size={16} className="text-emerald-400" /> 另存新檔
          </button>
          
          <div className="w-px h-6 bg-slate-600 mx-1"></div>

          {/* 設定按鈕 */}
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded transition"
            title="類別與顏色設定"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* 掛載類別設定視窗 */}
      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
};