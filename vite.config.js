import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 服务配置
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    client : {
      overlay : true ,
      warnings : true ,
        runtimeErrors: (error) => {
          const ignoreErrors = [
            "ResizeObserver loop completed with undelivered notifications",
            "ResizeObserver loop limit exceeded",
            "Non-passive event listener",
            "Script error"
          ];
          if (ignoreErrors.some(errorMessage => error.message.includes(errorMessage))) {
            return false;
          }
          return true;
        }
    }
    ,
    proxy : {
      "/api" : {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false
      },
      "/static": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false
      }
    }
  }
})
