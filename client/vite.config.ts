import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'

const rootPkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const repoUrl = typeof rootPkg.repository === 'string' ? rootPkg.repository : (rootPkg.repository?.url || '')

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version || '1.0.0'),
    __APP_HOMEPAGE__: JSON.stringify(rootPkg.homepage || (repoUrl ? repoUrl.replace(/\.git$/, '') + '#readme' : '')),
    __APP_REPOSITORY__: JSON.stringify(repoUrl ? repoUrl.replace(/\.git$/, '') : ''),
  },
})

