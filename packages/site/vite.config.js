import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import mdx from 'vite-plugin-mdx'
import { resolve } from 'path'

const optionsRefresh = {}

const optionsMdx = {
  remarkPlugins: [],
  rehypePlugins: []
}

export default defineConfig({
  plugins: [reactRefresh(optionsRefresh), mdx(optionsMdx)],
  base: '/crossaudio/',
  resolve: {
    alias: {
      react: resolve('node_modules/react')
    }
  }
})
