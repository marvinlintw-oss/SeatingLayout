// src/components/VenueCanvas/VenueCanvas.tsx
import React, { useRef, useState, useEffect } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Group, Line, Image as KonvaImage, Transformer } from 'react-konva';
import { useVenueStore, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../store/useVenueStore';
import { usePersonnelStore } from '../../store/usePersonnelStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useCanvasControls } from '../../hooks/useCanvasControls';
import { SeatNode, SEAT_WIDTH, SEAT_HEIGHT } from './SeatNode';
import { GridGenerateModal } from '../Modals/GridGenerateModal'; 
import { Minus, Plus, Grid3X3, Eraser, RotateCcw, HelpCircle, X, Maximize } from 'lucide-react';
import type { Seat } from '../../types';

const GRID_SIZE = 20;

export const VenueCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const dragStartPosRef = useRef<{ [seatId: string]: { x: number, y: number } }>({});

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, seatId: string } | null>(null);
  const [batchEditData, setBatchEditData] = useState<{ label?: string, rankWeight?: number, zone?: string }>({});
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  const [placingBatch, setPlacingBatch] = useState<{ rows: number, cols: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number, y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  const { 
    isEditMode, selectedSeatIds, 
    isSequencing, rankSequenceCounter, isNumbering, numberSequenceCounter,
    addSeat, updateSeatPosition, unassignSeat, undo, moveSeatsBatch,
    setSelection, addToSelection, clearSelection, copySelection, pasteSelection, deleteSelectedSeats,
    applyRankToSeat, applyNumberToSeat, updateSeatProperties, setSeatZone, updateSeatAssignment, toggleMainStage
  } = useVenueStore();

  const { syncSeatingStatus } = usePersonnelStore();

  const { activeSessionId, sessions, categories } = useProjectStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const seats = activeSession?.venue.seats || [];
  const stageScale = activeSession?.venue.stageScale || 0.4;
  const stagePosition = activeSession?.venue.stagePosition || { x: 0, y: 50 };
  const backgroundImage = activeSession?.venue.backgroundImage || null;

  const updateSessionVenue = (updates: Record<string, any>) => {
    if (!activeSessionId) return;
    useProjectStore.setState(state => ({
      sessions: state.sessions.map(s => s.id === activeSessionId ? { ...s, venue: { ...s.venue, ...updates } } : s)
    }));
  };

  const setStageScale = (val: number) => updateSessionVenue({ stageScale: val });
  const setStagePosition = (val: {x:number, y:number}) => updateSessionVenue({ stagePosition: val });
  const setBackgroundImage = (val: string | null) => updateSessionVenue({ backgroundImage: val });

  const { handleWheel, handleStageMouseDown, handleStageMouseMove, handleStageMouseUp } = useCanvasControls({
    containerRef, placingBatch, setMouseGridPos,
    setSelectionRect, selectionRect, clearContextMenu: () => setContextMenu(null), GRID_SIZE
  });

  useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          setSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
          if (stagePosition.x === 0 && stagePosition.y === 0) {
              setStageScale(0.4);
              setStagePosition({ x: (containerRef.current.offsetWidth - VIRTUAL_WIDTH * 0.4)/2, y: 50 });
          }
        }
      };
      window.addEventListener('resize', updateSize);
      updateSize();
      
      if (isEditMode && transformerRef.current && stageRef.current) {
         const selectedNodes = stageRef.current.find('.shape-stage');
         const stageNode = selectedNodes.find(n => selectedSeatIds.includes(n.id()));
         if (stageNode) {
             transformerRef.current.nodes([stageNode]);
             transformerRef.current.getLayer()?.batchDraw();
         } else {
             transformerRef.current.nodes([]);
         }
      }
  
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isEditMode) return;
        if (e.key === 'Delete') { deleteSelectedSeats(); syncSeatingStatus(); }
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'c') copySelection();
          if (e.key === 'v') { pasteSelection(100, 100); syncSeatingStatus(); }
          if (e.key === 'z') { e.preventDefault(); undo(); syncSeatingStatus(); }
        }
        if (e.key === 'Escape') {
          if (placingBatch) setPlacingBatch(null);
          clearSelection();
          setContextMenu(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('resize', updateSize);
        window.removeEventListener('keydown', handleKeyDown);
      };
  }, [isEditMode, selectedSeatIds, stagePosition.x, stagePosition.y, deleteSelectedSeats, syncSeatingStatus, copySelection, pasteSelection, undo, placingBatch, clearSelection]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
    } else setBgImageObj(null);
  }, [backgroundImage]);

  const snapToGrid = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button === 2) return;
      if (isEditMode && !placingBatch) {
         const isBackground = e.target === e.target.getStage() || e.target.name() === 'venue-background';
         if (isBackground && e.evt.ctrlKey) {
             const ptr = stageRef.current?.getRelativePointerPosition();
             if (ptr) addSeat(snapToGrid(ptr.x), snapToGrid(ptr.y));
         }
      }
      
      if (placingBatch && mouseGridPos) {
         const state = useProjectStore.getState();
         const currSession = state.sessions.find(s => s.id === state.activeSessionId);
         if (currSession) {
             const newSeats: Seat[] = [];
             let counter = currSession.venue.seats.length + 1;
             for (let r = 0; r < placingBatch.rows; r++) {
                 for (let c = 0; c < placingBatch.cols; c++) {
                     newSeats.push({
                         id: `seat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                         x: mouseGridPos.x + c * 110,
                         y: mouseGridPos.y + r * 160,
                         width: SEAT_WIDTH, height: SEAT_HEIGHT,
                         label: `${counter++}`,
                         type: 'seat',
                         assignedPersonId: null,
                         rankWeight: 50,
                         isPinned: false,
                         isVisible: true
                     });
                 }
             }
             useProjectStore.setState({
                 sessions: state.sessions.map(s =>
                     s.id === state.activeSessionId
                         ? { ...s, venue: { ...s.venue, seats: [...s.venue.seats, ...newSeats] } }
                         : s
                 )
             });
         }
         setPlacingBatch(null);
      }
  };

  const handleSeatContextMenu = (e: Konva.KonvaEventObject<PointerEvent>, seat: Seat) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      if (!selectedSeatIds.includes(seat.id)) setSelection([seat.id]);
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      if(ptr) {
         setContextMenu({ x: ptr.x, y: ptr.y, seatId: seat.id });
         setBatchEditData({});
      }
  };

  const handleBatchUpdate = () => {
      selectedSeatIds.forEach(id => {
          updateSeatProperties(id, batchEditData.label, batchEditData.rankWeight);
      });
      if (batchEditData.zone !== undefined) setSeatZone(selectedSeatIds, batchEditData.zone);
      setContextMenu(null);
  };

  const handleSeatDragStart = (e: Konva.KonvaEventObject<DragEvent>, seatId: string) => {
      if (isEditMode) {
          let currentSelection = selectedSeatIds;
          if (!selectedSeatIds.includes(seatId)) {
              if (!e.evt.shiftKey) {
                  setSelection([seatId]);
                  currentSelection = [seatId];
              } else {
                  addToSelection([seatId]);
                  currentSelection = [...selectedSeatIds, seatId];
              }
          }
          
          const startPositions: Record<string, {x: number, y: number}> = {};
          currentSelection.forEach(id => {
              const s = seats.find(seat => seat.id === id);
              if (s) startPositions[id] = { x: s.x, y: s.y };
          });
          dragStartPosRef.current = startPositions;
      }
  };

  const handleSeatDragMove = (e: Konva.KonvaEventObject<DragEvent>, seat: Seat) => {
      if (!isEditMode) return;
      
      const targetX = snapToGrid(e.target.x());
      const targetY = snapToGrid(e.target.y());
      e.target.x(targetX);
      e.target.y(targetY);

      const startPos = dragStartPosRef.current[seat.id];
      if (startPos) {
          const deltaX = targetX - startPos.x;
          const deltaY = targetY - startPos.y;

          selectedSeatIds.forEach(id => {
              if (id !== seat.id) {
                  const otherNode = stageRef.current?.findOne(`#${id}`);
                  const otherStartPos = dragStartPosRef.current[id];
                  if (otherNode && otherStartPos) {
                      otherNode.x(otherStartPos.x + deltaX);
                      otherNode.y(otherStartPos.y + deltaY);
                  }
              }
          });
      }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isEditMode) return;
    const personId = e.dataTransfer.getData('personId');
    if (!personId || !stageRef.current) return;
    const stage = stageRef.current;
    stage.setPointersPositions(e);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const rawX = (pointer.x - stage.x()) / stage.scaleX();
    const rawY = (pointer.y - stage.y()) / stage.scaleY();
    const closestSeat = seats.find(seat => 
      seat.isVisible !== false && seat.type !== 'shape' && 
      rawX >= seat.x && rawX <= seat.x + SEAT_WIDTH && 
      rawY >= seat.y && rawY <= seat.y + SEAT_HEIGHT
    );
    if (closestSeat) { updateSeatAssignment(closestSeat.id, personId); syncSeatingStatus(); }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-slate-200 overflow-hidden ${isEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if(file) {
              const reader = new FileReader();
              reader.onload = () => setBackgroundImage(reader.result as string);
              reader.readAsDataURL(file);
          }
      }} className="hidden" accept="image/*" />

      {contextMenu && (
        <div className="absolute z-50 bg-white shadow-xl rounded-lg p-3 border border-slate-200 w-64" style={{ top: contextMenu.y, left: contextMenu.x }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 border-b pb-2">
                <span className="font-bold text-sm">設定 ({selectedSeatIds.length} 個)</span>
                <button onClick={() => setContextMenu(null)}><X size={14}/></button>
            </div>
            <div className="space-y-3">
                <div className="flex gap-2 items-center">
                    <label className="text-xs w-12 text-slate-500">編號</label>
                    <input type="text" placeholder="輸入編號" className="border rounded px-2 py-1 text-sm flex-1" onChange={(e) => setBatchEditData(prev => ({...prev, label: e.target.value}))}/>
                </div>
                <div className="flex gap-2 items-center">
                    <label className="text-xs w-12 text-slate-500">優先度</label>
                    <input type="number" placeholder="0-100" className="border rounded px-2 py-1 text-sm flex-1" onChange={(e) => setBatchEditData(prev => ({...prev, rankWeight: Number(e.target.value)}))}/>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-slate-500 block mb-1">區塊屬性</span>
                    <div className="max-h-32 overflow-y-auto border rounded p-1 space-y-1">
                         <button onClick={() => setBatchEditData(prev => ({...prev, zone: ''}))} className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${batchEditData.zone === '' ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                            <span className="inline-block w-3 h-3 rounded-full bg-slate-200 mr-2 align-middle"></span>無屬性
                         </button>
                         {categories.map((cat: any) => (
                             <button key={cat.id} onClick={() => setBatchEditData(prev => ({...prev, zone: cat.label}))} className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${batchEditData.zone === cat.label ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                                <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle border border-slate-300" style={{backgroundColor: cat.color}}></span>{cat.label}
                             </button>
                         ))}
                    </div>
                </div>
                <button onClick={handleBatchUpdate} className="w-full bg-blue-600 text-white text-xs py-2 rounded font-bold mt-2">套用變更</button>
            </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => setShowHelp(!showHelp)} className="bg-white p-2 rounded-full shadow-md text-slate-600 hover:text-blue-600 transition"><HelpCircle size={24} /></button>
      </div>
      
      {showHelp && (
        <div className="absolute top-16 left-4 bg-white p-5 rounded-xl shadow-xl w-80 z-20 border border-slate-200 text-sm">
          <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-slate-800">操作說明 (v4.0)</h2><button onClick={() => setShowHelp(false)}><X size={18}/></button></div>
          <div className="space-y-3 text-slate-600">
            <div><strong className="text-blue-600 block mb-1">人員排位模式：</strong><ul><li><strong>左鍵拖曳：</strong>將已入座的人員拖曳至空位或互換座位。</li></ul></div>
            <div><strong className="text-red-600 block mb-1">場地編輯模式：</strong><ul><li><strong>Ctrl+左鍵：</strong>新增單一座位</li><li><strong>矩陣生成：</strong>點擊下方九宮格按鈕</li><li><strong>Shift+拖曳：</strong>框選多個座位</li><li><strong>右鍵：</strong>開啟屬性設定</li></ul></div>
          </div>
        </div>
      )}

      {showBatchModal && (
        <GridGenerateModal onClose={() => setShowBatchModal(false)} onConfirm={(rows, cols) => { setPlacingBatch({rows, cols}); setShowBatchModal(false); }} />
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-2xl z-10 flex items-center gap-6 border border-slate-200">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button onClick={() => setStageScale(Math.max(0.1, stageScale - 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Minus size={18}/></button>
          <span className="text-sm font-mono w-12 text-center font-bold text-slate-700">{(stageScale * 100).toFixed(0)}%</span>
          <button onClick={() => setStageScale(Math.min(5, stageScale + 0.1))} className="p-2 hover:bg-slate-100 rounded-full"><Plus size={18}/></button>
        </div>
        
        {isEditMode && (
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
             <button onClick={undo} className="p-2 hover:bg-slate-100 rounded" title="復原 (Ctrl+Z)"><RotateCcw size={18} /></button>
             <button onClick={() => setShowBatchModal(true)} className="p-2 hover:bg-slate-100 rounded text-blue-600" title="矩陣生成"><Grid3X3 size={18} /></button>
             <button onClick={deleteSelectedSeats} className="p-2 hover:bg-red-50 rounded text-red-600" title="刪除選取 (Del)"><Eraser size={18} /></button>
             <button onClick={toggleMainStage} className="p-2 hover:bg-slate-100 rounded text-purple-600" title="切換主舞台"><Maximize size={18}/></button>
          </div>
        )}
      </div>

      {/* 【核心防呆機制】等待 size 大於 0 之後，才真正掛載 Stage 避免 Canvas 崩潰 */}
      {size.width > 0 && size.height > 0 && (
        <Stage 
          width={size.width} height={size.height} 
          ref={stageRef}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onClick={handleStageClick}
          onWheel={handleWheel}
          scaleX={stageScale} scaleY={stageScale} x={stagePosition.x} y={stagePosition.y}
          onContextMenu={(e) => e.evt.preventDefault()}
        >
          <Layer>
            <Rect name="venue-background" x={0} y={0} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} fill="white" shadowBlur={20} shadowOpacity={0.1}/>
            {bgImageObj && <KonvaImage image={bgImageObj} width={VIRTUAL_WIDTH} height={VIRTUAL_HEIGHT} opacity={0.5} />}
            
            {isEditMode && (
                <Group opacity={0.3}>
                   {Array.from({ length: 40 }).map((_, i) => <Line key={`gx-${i}`} points={[i*100,0, i*100,VIRTUAL_HEIGHT]} stroke="#cbd5e1" strokeWidth={1} />)}
                   {Array.from({ length: 30 }).map((_, i) => <Line key={`gy-${i}`} points={[0,i*100, VIRTUAL_WIDTH,i*100]} stroke="#cbd5e1" strokeWidth={1} />)}
                </Group>
            )}

            {selectionRect && <Rect x={selectionRect.x} y={selectionRect.y} width={selectionRect.w} height={selectionRect.h} fill="rgba(59, 130, 246, 0.2)" stroke="#2563eb" dash={[4,4]} />}

            {placingBatch && mouseGridPos && (
               <Group>
                 {Array.from({ length: placingBatch.rows }).map((_, r) => 
                   Array.from({ length: placingBatch.cols }).map((_, c) => (
                      <Rect key={`ghost-${r}-${c}`} x={mouseGridPos.x + c * 110} y={mouseGridPos.y + r * 160} width={SEAT_WIDTH} height={SEAT_HEIGHT} fill="blue" opacity={0.3} cornerRadius={4} />
                   ))
                 )}
               </Group>
            )}

            {seats.map((seat) => (
               <SeatNode
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatIds.includes(seat.id)}
                  isEditMode={isEditMode}
                  isSequencing={isSequencing}
                  rankSequenceCounter={rankSequenceCounter}
                  isNumbering={isNumbering}
                  numberSequenceCounter={numberSequenceCounter}
                  onDragStart={handleSeatDragStart}
                  onDragMove={handleSeatDragMove}
                  onDragEnd={(e) => {
                      if (isEditMode) {
                          const targetX = snapToGrid(e.target.x());
                          const targetY = snapToGrid(e.target.y());
                          e.target.x(targetX);
                          e.target.y(targetY);

                          const startPos = dragStartPosRef.current[seat.id];
                          if (startPos) {
                              const deltaX = targetX - startPos.x;
                              const deltaY = targetY - startPos.y;

                              if (deltaX !== 0 || deltaY !== 0) {
                                  const otherSelectedIds = selectedSeatIds.filter(id => id !== seat.id);
                                  if (otherSelectedIds.length > 0) {
                                      moveSeatsBatch(otherSelectedIds, deltaX, deltaY);
                                  }
                                  updateSeatPosition(seat.id, targetX, targetY);
                              }
                          }
                          dragStartPosRef.current = {};
                      } else {
                          const stage = stageRef.current;
                          const pointer = stage?.getPointerPosition();
                          if (pointer && stage) {
                              const rawX = (pointer.x - stage.x()) / stage.scaleX();
                              const rawY = (pointer.y - stage.y()) / stage.scaleY();
                              const targetSeat = seats.find(s => 
                                  s.isVisible !== false && s.type !== 'shape' && 
                                  rawX >= s.x && rawX <= s.x + SEAT_WIDTH && 
                                  rawY >= s.y && rawY <= s.y + SEAT_HEIGHT
                              );
                              if (targetSeat && targetSeat.id !== seat.id) {
                                  const tempPersonId = targetSeat.assignedPersonId;
                                  updateSeatAssignment(targetSeat.id, seat.assignedPersonId);
                                  updateSeatAssignment(seat.id, tempPersonId);
                                  syncSeatingStatus();
                              }
                          }
                          e.target.to({ x: seat.x, y: seat.y, duration: 0.1 });
                      }
                  }}
                  onClick={(e) => {
                      if(isSequencing) { e.cancelBubble = true; applyRankToSeat(seat.id); return; }
                      if(isNumbering) { e.cancelBubble = true; applyNumberToSeat(seat.id); return; }
                      if(isEditMode) {
                          e.cancelBubble = true;
                          if(e.evt.shiftKey || e.evt.ctrlKey) addToSelection([seat.id]);
                          else setSelection([seat.id]);
                      }
                  }}
                  onContextMenu={handleSeatContextMenu}
                  onUnassign={(seatId) => { unassignSeat(seatId); syncSeatingStatus(); }}
                  onTransformEnd={(e, seatToTransform) => {
                      if (seatToTransform.type === 'shape') {
                          const node = e.target;
                          const scaleX = node.scaleX();
                          const scaleY = node.scaleY();
                          node.scaleX(1);
                          node.scaleY(1);
                          const newWidth = Math.round((seatToTransform.width || 600) * scaleX);
                          const newHeight = Math.round((seatToTransform.height || 150) * scaleY);
                          const newX = snapToGrid(node.x());
                          const newY = snapToGrid(node.y());
                          
                          const state = useProjectStore.getState();
                          useProjectStore.setState({
                              sessions: state.sessions.map(s => s.id === state.activeSessionId ? {
                                  ...s,
                                  venue: {
                                      ...s.venue,
                                      seats: s.venue.seats.map(st => st.id === seatToTransform.id ? { 
                                          ...st, x: newX, y: newY, width: newWidth, height: newHeight 
                                      } : st)
                                  }
                              } : s)
                          });
                      }
                  }}
               />
            ))}

            <Transformer ref={transformerRef} boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 50 || newBox.height < 50) return oldBox;
                return newBox;
            }}/>
          </Layer>
        </Stage>
      )}
    </div>
  );
};