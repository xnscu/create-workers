#!/usr/bin/env node

import * as fs from 'node:fs'
import * as path from 'node:path'
import os from 'os';

import minimist from 'minimist'
import prompts from 'prompts'
import { red, green, bold } from 'kolorist'

import ejs from 'ejs'

import * as banners from './utils/banners'

import renderTemplate from './utils/renderTemplate'
import { postOrderDirectoryTraverse, preOrderDirectoryTraverse } from './utils/directoryTraverse'
import generateReadme from './utils/generateReadme'
import getCommand from './utils/getCommand'
import renderEslint from './utils/renderEslint'
import sortDependencies from './utils/sortDependencies'
import deepMerge from './utils/deepMerge'
import { version } from './package.json'
import util from 'util'

const exec = util.promisify(require('child_process').exec)

console.log('version:', version)
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

function random(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return str
}

function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

function canSkipEmptying(dir: string) {
  if (!fs.existsSync(dir)) {
    return true
  }

  const files = fs.readdirSync(dir)
  if (files.length === 0) {
    return true
  }
  if (files.length === 1 && files[0] === '.git') {
    return true
  }

  return false
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  )
}

const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm

// Parser src into an Object
function parseEnv(src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/gm, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = match[2] || ''

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}
const envContext: any = parseEnv(
  fs.readFileSync(path.resolve(__dirname, '.env'), { encoding: 'utf8' })
)

const normalizeArgv = (argv) => {
  const d: any = {}
  for (const key in argv) {
    d[key.replace(/-/g, '_').toUpperCase()] = argv[key]
  }
  if (d.PROD) {
    d.NODE_ENV = 'production'
  } else {
    d.NODE_ENV = 'development'
  }
  d.HTTPS = d.HTTPS ?? true
  if (d.HTTPS) {
    d.VITE_HTTPS = 'on'
  }
  if (d.HOST) {
    d.VITE_HOST = d.HOST
  } else {
    d.HOST = envContext.VITE_HOST
    d.VITE_HOST = d.HOST
  }
  return d
}
const GH_CONFIG_PATH = `${os.homedir()}/.config/gh/hosts.yml`;
function getGhConfig() {
	if (fs.existsSync(GH_CONFIG_PATH)) {
		const hosts = fs.readFileSync(GH_CONFIG_PATH, "utf8");
    const gh_user_match = hosts.match(/\s+user:\s*([^\n\r]+)/);
		if (gh_user_match) {
			return {user: gh_user_match[1]}
		}
	}
}
async function init() {
  console.log()
  console.log(
    process.stdout.isTTY && process.stdout.getColorDepth() > 8
      ? banners.gradientBanner
      : banners.defaultBanner
  )
  console.log()
  const cwd = process.cwd()
  // possible options:
  // --default
  // --typescript / --ts
  // --jsx
  // --router / --vue-router
  // --pinia
  // --eslint
  // --eslint-with-prettier (only support prettier through eslint for simplicity)
  // --force (for force overwriting)
  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ['ts'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'],
    // all arguments are treated as booleans
    boolean: true
  })
  const normalizedArgv = normalizeArgv(argv)

  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vitex' : targetDir
  const forceOverwrite = argv.force

  let result: {
    projectName?: string
    userName?: string,
    shouldOverwrite?: boolean
    packageName?: string
    isProduction?: boolean
  } = {}

  try {
    // Prompts:
    // - Project name:
    //   - whether to overwrite the existing directory or not?
    //   - enter a valid package name for package.json
    result = await prompts(
      [
        {
          name: 'projectName',
          type: targetDir ? null : 'text',
          message: 'Project name:',
          initial: 'vitex-project',
          onState: (state) => (targetDir = String(state.value).trim() || 'vitex-project')
        },
        {
          name: 'userName',
          type: argv.user ? null : 'text',
          message: 'github username:',
          initial: getGhConfig()?.user ?? 'vitex-user',
          validate: (dir) => isValidPackageName(dir) || 'Invalid github username'
        },
        {
          name: 'shouldOverwrite',
          type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'toggle'),
          message: () => {
            const dirForPrompt =
              targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`

            return `${dirForPrompt} is not empty. Remove existing files and continue?`
          },
          initial: true,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'overwriteChecker',
          type: (prev, values) => {
            if (values.shouldOverwrite === false) {
              throw new Error(red('✖') + ` Operation cancelled`)
            }
            return null
          }
        },

        {
          name: 'packageName',
          type: () => (isValidPackageName(targetDir) ? null : 'text'),
          message: 'Package name:',
          initial: () => toValidPackageName(targetDir),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name'
        }
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ` Operation cancelled`)
        }
      }
    )
  } catch (cancelled) {
    console.log(cancelled.message)
    process.exit(1)
  }

  // `initial` won't take effect if the prompt type is null
  // so we still have to assign the default values here
  const {
    // projectName = targetDir,
    // packageName = projectName ?? defaultProjectName,
    userName = argv.user,
    shouldOverwrite = argv.force,
    isProduction = argv.prod,
  } = result

  const PGPASSWORD = isProduction ? random(16) : 'postgres'
  const root = path.join(cwd, targetDir)
  const projectName = path.basename(root)
  const packageName = projectName ?? defaultProjectName

  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }

  console.log(`\nScaffolding project in ${root}...`)

  const pkg = { name: packageName, version: '0.0.0' }
  await exec(
    `uname -s | grep -q Darwin && brew services start postgresql@15 || service postgresql start`
  )
// boot.cjs
//   await exec(`sudo -u postgres psql -w postgres <<EOF
//   ALTER USER postgres PASSWORD '${PGPASSWORD}';
//   CREATE DATABASE ${packageName};
// EOF`)
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

  // todo:
  // work around the esbuild issue that `import.meta.url` cannot be correctly transpiled
  // when bundling for node and the format is cjs
  // const templateRoot = new URL('./template', import.meta.url).pathname
  const templateRoot = path.resolve(__dirname, 'template')
  const callbacks = []
  const render = function render(templateName) {
    const templateDir = path.resolve(templateRoot, templateName)
    renderTemplate(templateDir, root, callbacks)
  }
  // Render base template
  render('.')

  // add dynamic scritps block
  const HOST = normalizedArgv.HOST
  const packageJsonPath = path.resolve(root, 'package.json')
  const existingPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const updatedPkg = sortDependencies(
    deepMerge(existingPkg, {
      name: projectName,
      "repository": {
        "type": "git",
        "url": `git+https://github.com/${userName}/${projectName}.git`
      },
      "bugs": {
        "url": `https://github.com/${userName}/${projectName}/issues`
      },
      "homepage": `https://github.com/${userName}/${projectName}#readme`,
      scripts: {
        'set-g': `git remote set-url origin git@github.com:${userName}/${projectName}.git`,
        'add-g': `git remote add origin git@github.com:${userName}/${projectName}.git`,
      }
    })
  )
  console.log({ argv, normalizedArgv, targetDir, projectName, userName })
  fs.writeFileSync(packageJsonPath, JSON.stringify(updatedPkg, null, 2) + '\n', 'utf-8')

  // An external data store for callbacks to share data
  const dataStore = {}
  // Process callbacks
  for (const cb of callbacks) {
    await cb(dataStore)
  }

  // EJS template rendering
  preOrderDirectoryTraverse(
    root,
    () => {},
    (filepath) => {
      if (filepath.endsWith('.ejs') && filepath.indexOf('/template/') === -1) {
        const template = fs.readFileSync(filepath, 'utf-8')
        const dest = filepath.replace(/\.ejs$/, '')
        const commandContext =
          path.basename(filepath) !== 'vite.config.js.ejs' ? normalizedArgv : argv
        const context = {
          ...envContext,
          ...dataStore[dest],
          ...commandContext,
          PGPASSWORD,
          TARGET_DIR: targetDir,
          PGDATABASE: projectName,
          VITE_NAME: projectName
        }
        const content = ejs.render(template, context)

        fs.writeFileSync(dest, content)
        fs.unlinkSync(filepath)
      }
    }
  )

  // Cleanup.

  // We try to share as many files between TypeScript and JavaScript as possible.
  // If that's not possible, we put `.ts` version alongside the `.js` one in the templates.
  // So after all the templates are rendered, we need to clean up the redundant files.
  // (Currently it's only `cypress/plugin/index.ts`, but we might add more in the future.)
  // (Or, we might completely get rid of the plugins folder as Cypress 10 supports `cypress.config.ts`)



  // Instructions:
  // Supported package managers: pnpm > yarn > npm
  const userAgent = process.env.npm_config_user_agent ?? ''
  const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'



  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    const cdProjectName = path.relative(cwd, root)
    console.log(
      `  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`
    )
  }
  // console.log(`  ${bold(green(getCommand(packageManager, 'init-github')))}`)
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`)
  console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`)
  const installUI = `npx -y cpgit primefaces/primevue -s=packages/primevue/src lib/primevue
npx -y cpgit vueComponent/ant-design-vue -s=components lib/ant-design-vue`
  console.log(`\nCopy PrimeVue and Ant-Design-Vue to lib folder:\n`)
  console.log(bold(green(installUI)))
  console.log(`\nIf you want to initialize project as a github repo, run:\n`)
  const githubCreateString = `
  cd ${projectName} &&
  git init --initial-branch=master &&
  git add . &&
  git commit -am "initial commit by create-workers" &&
  gh repo create ${projectName} --private --source=. && git push --set-upstream origin master`
  console.log(`  ${bold(green(githubCreateString))}`)
  console.log()
}

init().catch((e) => {
  console.error(e, '1')
})
