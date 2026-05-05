import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base must match the repository path for GitHub Pages project sites
  base: "/ASP_1/",
})
