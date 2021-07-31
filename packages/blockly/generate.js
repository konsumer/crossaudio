#!/usr/bin/env node

// this will generate blockly JSON definitions from MDN docs
// you shouldn't need to run this
// I just left it here for reference

import fetch from 'node-fetch'
import { JSDOM } from 'jsdom'
import { promises as fs } from 'fs'

// kinda like jquery, for URLs
const $ = async (selector, context) => {
  if (!context) {
    context = selector
    selector = undefined
  }
  if (typeof context === 'string') {
    context = (new JSDOM(await fetch(context).then(r => r.text()))).window.document
  }
  if (selector) {
    return [...context.querySelectorAll(selector)]
  } else {
    return context
  }
}

// pull out a list of all audio interfaces
const getInterfaces = async () => Promise.all(
  (await $('.toggle:nth-child(3) li a', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API'))
    .map(async a => {
      return {
        name: a.textContent,
        url: `https://developer.mozilla.org${a.href}`
      }
    })
)

// find things with "Node" in name that have properties
const getNodes = async interfaces => (await Promise.all(
  interfaces
    .filter(i => i.name.match('Node'))
    .map(async node => {
      const page = await $(node.url)

      const properties = (await $('table.properties tr', page))
        .map(e => e.textContent
          .trim()
          .split(/[\n\t]+/g)
          .map(t => t.replace(/"/g, ''))
        )
        .reduce((a, c) => ({ ...a, [c[0]]: c[1].trim() }), {})

      const params = await Promise.all(
        (await $('#properties + div dt a', page))
          .map(a => ({ name: a.textContent.replace(`${node.name}.`, ''), url: `https://developer.mozilla.org${a.href}` }))
          .map(async (p, i) => {
            p.description = (await $(`#properties + div dd:nth-child(${(i + 1) * 2})`, page))[0]?.textContent
            return p
          })
      )

      // TODO: normalize params as numbers/etc

      const description = (await $('.seoSummary', page))[0]?.textContent

      return {
        ...node,
        properties,
        description,
        params
      }
    })
))
  .filter(i => Object.keys(i.properties).length)

// turn node-descriptions into blockly-descriptions
// TODO: generate stub JSON definition of block
const getBlocks = nodes => nodes.map(node => {
  return node
})

async function main () {
  await fs.writeFile('nodes.json', JSON.stringify(await getNodes(await getInterfaces()), null, 2))
}

main()
