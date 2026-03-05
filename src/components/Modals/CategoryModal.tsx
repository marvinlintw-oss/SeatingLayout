// src/components/Modals/CategoryModal.tsx
import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useSystemStore } from '../../store/useSystemStore';
import { X, Plus, Trash2, Tags, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { categories } = useProjectStore();
  const { addCategory, updateCategory, removeCategory, initDefaultCategories } = useSystemStore();

  const [newLabel, setNewLabel] = useState('');
  const [newWeight, setNewWeight] = useState(50);
  const [newColor, setNewColor] = useState('#bfdbfe'); 
  const [newPersonColor, setNewPersonColor] = useState('#ffffff'); 

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addCategory(newLabel.trim(), newWeight, newColor, newPersonColor);
    setNewLabel('');
    setNewWeight(50);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* 標題區 */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Tags size={20} className="text-blue-600"/> 類別與顏色設定
          </h2>
          <div className="flex items-center gap-2">
            {categories.length === 0 && (
              <button 
                onClick={initDefaultCategories} 
                className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition"
              >
                <Download size={14}/> 載入預設值
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
              <X size={20}/>
            </button>
          </div>
        </div>
        
        {/* 內容區 */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
          
          <div className="space-y-2 mb-6">
            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-bold text-slate-500 mb-1">
               <div className="col-span-4">類別名稱</div>
               <div className="col-span-2 text-center">權重</div>
               <div className="col-span-2 text-center">區塊顏色</div>
               <div className="col-span-2 text-center">名牌顏色</div>
               <div className="col-span-2 text-center">操作</div>
            </div>
            
            {categories.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                目前沒有任何類別，請手動新增或點擊右上角「載入預設值」。
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200 shadow-sm hover:border-blue-300 transition">
                  <div className="col-span-4 font-bold text-sm text-slate-700 truncate px-1" title={cat.label}>
                    {cat.label}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="number" 
                      value={cat.weight} 
                      onChange={(e) => updateCategory(cat.id, { weight: Number(e.target.value) })}
                      className="w-16 border rounded px-1 py-0.5 text-sm text-center outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="color" 
                      value={cat.color} 
                      onChange={(e) => updateCategory(cat.id, { color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="color" 
                      value={cat.personColor} 
                      onChange={(e) => updateCategory(cat.id, { personColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button 
                      onClick={() => { if(window.confirm(`確定刪除類別「${cat.label}」嗎？`)) removeCategory(cat.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      title="刪除"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 新增類別區塊 */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
             <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-1">
               <Plus size={16}/> 新增類別
             </h3>
             <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <label className="text-xs text-slate-500 block mb-1">類別名稱</label>
                  <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="例如：媒體" className="w-full border rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">權重</label>
                  <input type="number" value={newWeight} onChange={e => setNewWeight(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm text-center outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">區塊色</label>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border-0 p-0" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">名牌色</label>
                  <input type="color" value={newPersonColor} onChange={e => setNewPersonColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border-0 p-0" />
                </div>
                <div className="col-span-2">
                  <button onClick={handleAdd} className="w-full bg-blue-600 text-white font-bold py-1.5 rounded hover:bg-blue-700 transition shadow-sm text-sm h-[34px]">
                    新增
                  </button>
                </div>
             </div>
          </div>
          
        </div>
        
        {/* 底部按鈕 */}
        <div className="p-4 border-t border-slate-200 flex justify-end bg-white rounded-b-xl">
          <button onClick={onClose} className="px-6 py-2 text-sm font-bold bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition shadow-sm">
            完成
          </button>
        </div>
        
      </div>
    </div>
  );
};