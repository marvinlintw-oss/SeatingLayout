// src/utils/constants.ts

export const CSV_HEADERS = [
  { label: '姓名', key: 'name' },
  { label: '職稱', key: 'title' },
  { label: '單位', key: 'organization' },
  { label: '類別', key: 'category' },
  { label: '權重', key: 'rankScore' }
];

export const DEFAULT_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#86efac', '#6ee7b7', '#67e8f9', 
  '#93c5fd', '#a5b4fc', '#c4b5fd', '#f0abfc', '#f9a8d4', '#fda4af'
];

export const CATEGORY_PRESETS = [
  { label: '府院首長', weight: 100 },
  { label: '部會首長', weight: 90 },
  { label: '地方首長', weight: 80 },
  { label: '民意代表', weight: 70 },
  { label: '外賓與口譯', weight: 85 },
  { label: '主辦單位', weight: 60 },
  { label: '協辦單位', weight: 50 },
  { label: '媒體', weight: 40 },
  { label: '工作人員', weight: 10 },
  { label: '一般貴賓', weight: 30 }
];