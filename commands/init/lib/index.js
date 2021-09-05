'use strict'
const fs = require('fs')
const os = require('os')
const Command = require('@imooc-night-dev/command')
const log = require('@imooc-night-dev/log')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const Package = require('@imooc-night-dev/package')
const getTemplate = require('./get-template')
const ora = require('ora')

const TEMPLATE = {
  project: 'project',
  component: 'component'
}

class InitCommand extends Command {
  constructor (argv) {
    super(argv)
  }

  init () {
    this._projectName = this.cmdArgs[0] || ''
    this.force = this.cmdOptions.force
  }

  async exec () {
    // 1.准备阶段，收集创建的信息
    const projectInfo = await this.prepare()
    this.projectInfo = projectInfo

    log.verbose('projectInfo', projectInfo, this.templates)
    // 2.下载模板

    await this.downloadTemplate()
  }

  async downloadTemplate () {
    const { template } = this.projectInfo
    const seletedTemp = this.templates.find(t => t.packageName === template)
    log.verbose('selected-template', seletedTemp)
    const targetPath = path.resolve(
      os.homedir,
      process.env.CLI_HOME_PATH,
      'templates'
    )
    const storePath = path.resolve(targetPath, 'node_modules')
    log.verbose(
      seletedTemp.packageName,
      seletedTemp.version,
      targetPath,
      storePath
    )
    const pkg = new Package({
      targetPath,
      storePath,
      pkgName: seletedTemp.packageName,
      pkgVersion: seletedTemp.version,
      silence: true
    })
    const isExisted = await pkg.exist()
    if (isExisted) {
      const spinner = ora(`${seletedTemp.packageName} is updating`).start()
      await pkg.update()
      spinner.stop().clear()
      log.success('template updated succeed')
    } else {
      const spinner = ora(`${seletedTemp.packageName} is installing`).start()
      await pkg.install()
      log.success('template installed succeed')
      spinner.stop().clear()
    }
  }

  async prepare () {
    try {
      const temps = (this.templates = await getTemplate())
      if (!temps || (temps && temps.length === 0)) {
        return log.error('没有模板可以使用')
      }
    } catch (e) {
      log.error(e.message)
    }

    const cwd = process.cwd()
    const isEmpty = this.ifDirEmpty(cwd)
    let isContinue = false
    if (!isEmpty) {
      isContinue = (
        await inquirer.prompt([
          {
            type: 'confirm',
            default: false,
            name: 'isContinue',
            message: 'The dir is not empty, Do you want to go on?'
          }
        ])
      ).isContinue

      if (!isContinue) {
        return
      }
    }
    if (isContinue || this.force) {
      // 二次确认删除
      const { decided } = await inquirer.prompt([
        {
          type: 'confirm',
          default: false,
          name: 'decided',
          message: 'Are you sure to delete?'
        }
      ])
      if (decided) {
        fse.emptyDirSync(cwd)
      }
    }

    return await this.getProjectInfo()
  }

  ifDirEmpty (localPath) {
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter(
      f => !f.startsWith('.') && !['node_modules'].includes(f)
    )
    return !fileList || fileList.length === 0
  }

  getTemplates () {
    if (!Array.isArray(this.templates)) {
      return []
    }
    return this.templates.map(item => ({
      name: item.name,
      value: item.packageName
    }))
  }

  async getProjectInfo () {
    let projectInfo = null
    const { projectType } = await inquirer.prompt([
      {
        type: 'list',
        default: TEMPLATE.project,
        name: 'projectType',
        message: 'To create a project or a component:',
        choices: [
          {
            value: TEMPLATE.project,
            name: '项目'
          },
          {
            value: TEMPLATE.component,
            name: '组件'
          }
        ]
      }
    ])

    if (projectType === TEMPLATE.project) {
      projectInfo = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'input a project name:',
          validate (v) {
            return !!v
          },
          filter (v) {
            return v
          }
        },
        {
          type: 'input',
          default: '1.0.0',
          name: 'projectVersion',
          message: 'input a project version:',
          validate (v) {
            return !!v
          },
          filter (v) {
            return v
          }
        },
        {
          type: 'list',
          name: 'template',
          message: 'select a template to init',
          choices: this.getTemplates()
        }
      ])
    }

    return projectInfo
  }
}

function init (argv) {
  return new InitCommand(argv)
}

module.exports = init
