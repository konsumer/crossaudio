const { exec } = require('child_process')
const { mkdir, readFile, writeFile, realpath } = require('fs').promises
const { basename } = require('path')
const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')
const inquirer = require('inquirer')
const { promisify } = require('util')
const ora = require('ora')

// simple wrapper around npm command
const run = promisify(exec)
const npm = (command) => run(`npm ${command}`, { cwd: process.cwd() })

async function init () {
  const choices = ['cli', 'vanilla', 'react']
  const argv = yargs(hideBin(process.argv))
    .usage('$0 [name] [options]')

    .positional('name', {
      description: 'The name of the project to initialize',
      type: 'string',
      default: basename(process.cwd())
    })

    .option('template', {
      alias: 't',
      description: 'The project template to initialize',
      type: 'string',
      default: 'cli',
      choices
    })

    .alias('help', 'h')
    .alias('version', 'v').argv

  // if no name, use inquirer
  const when = !argv._[0]

  // positional doesn't work in top-level options
  argv.name = argv._[0] || basename(process.cwd())

  const questions = [
    {
      name: 'name',
      message: "What is your project's name?",
      type: 'input',
      default: argv.name,
      when
    },
    {
      name: 'template',
      message: 'What kind of project is it?',
      type: 'list',
      choices,
      default: argv.template,
      when
    }
  ]

  const options = { ...argv, ...(await inquirer.prompt(questions)) }

  // clean up duplications
  delete options.t
  delete options._

  console.log(
    `Creating a Crossaudio ${options.template} application named ${options.name}...`
  )

  const templates = {
    // shared
    synth: await readFile(`${__dirname}/templates/synth.js`),
    gitignore: await readFile(`${__dirname}/templates/gitignore`),

    // vanilla
    run: await readFile(`${__dirname}/templates/run.js`),

    // react
    vite: await readFile(`${__dirname}/templates/vite.config.js`),
    index: await readFile(`${__dirname}/templates/index.html`),
    main: await readFile(`${__dirname}/templates/main.jsx`),
    favicon: await readFile(`${__dirname}/templates/favicon.svg`),
    style: await readFile(`${__dirname}/templates/style.css`)
  }

  // name was given, which means use a subdir
  if (!when) {
    await mkdir(options.name)
    process.chdir(options.name)
  }

  await mkdir('src')
  await Promise.all([
    writeFile('./.gitignore', templates.gitignore),
    writeFile('./src/synth.js', templates.synth),
    npm('init -y')
  ])

  if (options.template === 'cli') {
    const action = async () => {
      await npm(
        'install --no-audit --save --save-exact --loglevel error crossaudio'
      )
      await npm(
        'install --no-audit --save --save-exact --loglevel error -D nodemon'
      )
    }
    await ora.promise(action(), 'Installing crossaudio CLI tools')
  }

  if (options.template === 'vanilla') {
    const action = async () => {
      await npm(
        'install --no-audit --save --save-exact --loglevel error @crossaudio/core easymidi'
      )
      await npm(
        'install --no-audit --save --save-exact --loglevel error -D nodemon'
      )
      await writeFile('./src/run.js', templates.run)
    }
    await ora.promise(action(), 'Installing crossaudio & easymidi')
  }

  if (options.template === 'react') {
    const action = async () => {
      await npm(
        'install --no-audit --save --save-exact --loglevel error react react-dom @crossaudio/react'
      )
      await npm(
        'install --no-audit --save --save-exact --loglevel error -D @vitejs/plugin-react-refresh vite'
      )
      await Promise.all([
        writeFile('vite.config.js', templates.vite),
        writeFile('src/main.jsx', templates.main),
        writeFile('index.html', templates.index),
        writeFile('src/favicon.svg', templates.favicon),
        writeFile('src/style.css', templates.style)
      ])
    }
    await ora.promise(action(), 'Installing crossaudio, react & vite')
  }

  const pkg = JSON.parse(await readFile('package.json'))
  pkg.type = 'module'

  if (options.template === 'cli') {
    pkg.scripts = {
      start: "nodemon -x 'crossaudio --note=note' ./src/synth.js",
      run: 'crossaudio --note=note ./src/synth.js'
    }
  }

  if (options.template === 'vanilla') {
    pkg.scripts = {
      start: 'nodemon ./src/run.js',
      run: 'node ./src/run.js'
    }
  }

  if (options.template === 'react') {
    pkg.scripts = {
      build: 'vite build',
      start: 'vite dev'
    }
  }

  await writeFile('package.json', JSON.stringify(pkg, null, 2))
}

module.exports = { init }
