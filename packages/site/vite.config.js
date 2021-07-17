import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import mdx from 'vite-plugin-mdx'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'

const optionsRefresh = {}

const optionsMdx = {
  remarkPlugins: [],
  rehypePlugins: []
}

export default defineConfig({
  plugins: [reactRefresh(optionsRefresh), mdx(optionsMdx)],
  base: '/crossaudio/',
  rollupInputOptions: {
    pluginsPreBuild: [peerDepsExternal()]
  }
})
