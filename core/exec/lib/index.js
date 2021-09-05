'use strict';
const os = require('os')
const path = require('path')
const child_process = require('child_process')
const Package = require('@imooc-night-dev/package')
const log = require('@imooc-night-dev/log')

const homeDir = os.homedir

const SETTING = {
  'init': '@imooc-cli/init'
}
const cacheDirOfCli = 'dependencies'

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  let storePath = ''
  let pkg
  const pkgVersion = 'latest'
  const cmd = arguments[arguments.length - 1]
  const name = 'init'

  if (!targetPath) {
    targetPath = path.resolve(homeDir, process.env.CLI_HOME_PATH, cacheDirOfCli)
    storePath = path.resolve(targetPath, 'node_modules')
    log.verbose(targetPath, storePath)
    pkg = new Package({
      targetPath,
      storePath,
      pkgName: SETTING[name],
      pkgVersion
    })
    if (await pkg.exist()) {
      await pkg.update()
    } else {
      await pkg.install()
    }
  } else {
    pkg = new Package({
      targetPath,
      pkgName: SETTING[name],
      pkgVersion
    })
  }

  const rootPath = pkg.getRootPath()

  if (rootPath) {
    const o = Object.create(null)
    const args = Array.from(arguments)
    const cmdOptions = args[args.length - 1]
    Object.keys(cmdOptions).forEach((k) => {
      if (cmdOptions.hasOwnProperty(k) && !k.startsWith('_') && k !== 'parent') {
        o[k] = cmdOptions[k]
      }
    })
    args[args.length - 1] = o
    // window 系统 spawn 执行代码
    // spawn('cmd', ['-c', 'node', '-e', code])
    const child = child_process.spawn('node', ['-e', `require('${rootPath}').call(null,${JSON.stringify(args)})`], {
      cwd: process.cwd(),
      stdio: 'inherit'
    })
    child.on('error', (err) => {
      log.error(err)
      process.exit(1)
    })
    child.on('exit', (code) => {
      log.verbose('init exec done, code:', code)
      process.exit(code)
    })
  }
}


function spawn(command, args, options) {
  const isWin = os.platform() === 'win32'

  command = isWin ? 'cmd' : command

  args = isWin ? ['-e' /* 静默执行 */].concat(args) : args

  return child_process.spawn(command, args, options || {})
}

module.exports = exec;