import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Netlify's dev emulation starts a Deno edge-functions server that crashes
    // on this machine's Deno version. The app uses no edge functions, so the
    // adapter only needs to run for the production build.
    command === 'build' ? netlify() : null,
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
}))

export default config
