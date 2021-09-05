#! /usr/bin/env node
const os = require('os')
const path = require('path')

const semver = require('semver')
const colors = require('colors')
const pathExists = require('path-exists').sync
const dotenv = require('dotenv')
const { Command } = require('commander')
const pkg = require('../package.json')
const {getNpmVersionsByBenchmark} = require('@imooc-night-dev/get-npm-info')
const log = require('@imooc-night-dev/log')
const exec = require('@imooc-night-dev/exec')

const { LOW_NODE_VERSION, DEFAULT_HOME_CLI_CONFIG, LOG_LEVEL_VERBOSE } = require('./constant')

const homeDir = os.homedir()
const binName = Object.keys(pkg.bin)[0]

const program = new Command()

async function core() {
  try {
    await prepare()
    registryCommander()
  } catch(e) {
    log.error(e.message)
    if (process.env.LOG_LEVEL === LOG_LEVEL_VERBOSE) {
      console.log(e)
    }
  }
}


async function prepare() {
  // checkVersion()
  checkNodeVersion()
  checkRoot()
  checkHomeDir()
  // checkInputArgs()
  // log.verbose('cli', 'verbose something')
  checkEnv()
  await checkIfNeedUpdate()
}


function checkNodeVersion() {
  if (semver.gte(LOW_NODE_VERSION, process.version)) {
    throw new Error(colors.red(`当前版本小于所需最低node版本`))
  }
}

function checkRoot() {
  require('root-check')()
}

function checkHomeDir() {
  // console.log(os.homedir())
  if (!homeDir || !pathExists(homeDir)) {
    throw new Error(colors.red('当前用户的主目录不存在'))
  }
}

/**
 * @checkInputArgs 根据当前是否为调试模式来设置当前的log等级
*/
// function checkInputArgs() {
//   const args = yargsParser(process.argv.slice(2))
//   if (args.debug) {
//     log.level = 'verbose'
//   }
// }

function checkEnv() {
  const envConfigPath = path.resolve(homeDir, '.env')
  if (pathExists(envConfigPath)) {
    dotenv.config({
      path: envConfigPath
    })
  }
  createDefaultConfig()
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
}


function createDefaultConfig() {
  const cliHomeConfig = {}
  if (process.env.CLI_HOME) {
    cliHomeConfig.cliHome = path.join(homeDir, process.env.CLI_HOME)
  } else {
    cliHomeConfig.cliHome = path.join(homeDir, DEFAULT_HOME_CLI_CONFIG)
  }
  process.env.CLI_HOME_PATH = cliHomeConfig.cliHome
}

async function checkIfNeedUpdate() {
  const currentPkgVersion = pkg.version
  const currentPkgName = pkg.name
  const verisonGtCurrent = await getNpmVersionsByBenchmark(currentPkgName, `>${currentPkgVersion}`)
  if (verisonGtCurrent && verisonGtCurrent.length) {
    log.warn(`current version is ${currentPkgVersion}, and latest version is ${verisonGtCurrent[0]},
    you can update by  npm update ${currentPkgName}`)
  }
}


function registryCommander() {
  program
    .name(binName)
    .version(pkg.version)
    .usage('<command> [options]')
    .option('-d, --debug', 'start a debug mode', false)
    .option('-tp, --targetPath <targetPath>', 'a path to init commander')

  program
    .command('init')
    .argument('<projectName>', 'project name to init')
    .option('-f, --force', 'force to init, may replacing all existed files', false)
    .description('init a project')
    .action(exec)

  program
    .action((actions, command) => {
      if (command.args && command.args.length === 0) {
        log.error(binName,'A command is required. Pass --help to see all available commands and options.')
      }
    })

  program.on('option:targetPath', function(tp) {
    process.env.CLI_TARGET_PATH = tp
  })

  program.on('option:debug', function() {
    log.level = process.env.LOG_LEVEL = LOG_LEVEL_VERBOSE
  })

  // 只有不存在的command才能监听到
  program.on('command:*', function(operands) {
    const availableCommands = program.commands.map(cmd => cmd.name())
    log.error(`error: unknown command '${operands[0]}'`)
    log.info(`available commands: ${availableCommands.join(',')}`)
    log.info('or pass --help to see all available commands and options.')
  })

  program.parse(process.argv)
}


core()