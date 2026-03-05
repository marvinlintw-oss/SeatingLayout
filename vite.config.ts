import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 【關鍵修改】改成您 GitHub 儲存庫的名稱，這樣就絕對不會跟舊的 SeatingLayout 衝到了！
  base: '/seat-system/', 
})