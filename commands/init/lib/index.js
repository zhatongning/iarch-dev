'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const Command = require('@imooc-night-dev/command')
const log = require('@imooc-night-dev/log')
const inquirer = require('inquirer')
const fse = require('fs-extra')
const Package = require('@imooc-night-dev/package')
const getTemplate = require('./get-template')
const ora = require('ora')
const semver = require('semver')
const glob = require('glob')
const ejs = require('ejs')
const kebabCase = require('lodash.kebabcase')

const TEMPLATE = {
  project: 'project',
  component: 'component'
}

const TEMPLATE_TYPE = {
  normal: 'normal',
  custom: 'custom'
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

    if (!projectInfo) return

    this.projectInfo = projectInfo

    log.verbose('projectInfo', projectInfo)

    // 2.下载模板
    await this.downloadTemplate()

    // 3.将模板复制到当前目录下
    await this.copyTemplate()
  }

  async downloadTemplate () {
    const { template } = this.projectInfo
    const seletedTemp = this.templates.find(t => t.packageName === template)
    this.currentTemplate = seletedTemp
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
    this.storeModulePath = path.resolve(
      storePath,
      await pkg.getCacheModuleName()
    )
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
      const temps = await getTemplate()
      log.verbose('模板数据', temps)
      if (!temps || (temps && temps.length === 0)) {
        return log.error('没有模板可以使用')
      }
      this.templates = temps
    } catch (e) {
      log.error('获取模板失败')
      return
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

  getProjectTemplates () {
    if (!Array.isArray(this.templates)) {
      return []
    }
    return this.templates.map(item => ({
      name: item.name,
      value: item.packageName
    }))
  }

  _isValidProjectName (name) {
    const reg = /^[a-zA-Z][\w_]*[a-zA-Z0-9]$/
    return reg.test(name)
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
      const promptOptions = []
      if (this._projectName && this._isValidProjectName(this._projectName)) {
        projectInfo = {
          projectName: kebabCase(this._projectName)
        }
      } else {
        promptOptions.push({
          type: 'input',
          name: 'projectName',
          message: 'input a project name:',
          validate: v => {
            return this._isValidProjectName(v)
          },
          filter (v) {
            return kebabCase(v)
          }
        })
      }
      promptOptions.push(
        {
          type: 'input',
          default: '1.0.0',
          name: 'projectVersion',
          message: 'input a project version:',
          validate (v) {
            // 正则 /^v|^[0-9]+.[0-9]+.[0-9]+/
            return !!semver.valid(v)
          },
          filter (v) {
            return v
          }
        },
        {
          type: 'list',
          name: 'template',
          message: 'select a template to init',
          choices: this.getProjectTemplates()
        }
      )
      projectInfo = {
        ...projectInfo,
        ...(await inquirer.prompt(promptOptions))
      }
    }

    return projectInfo
  }

  copyTemplate () {
    if (this.currentTemplate.type) {
      if (this.currentTemplate.type === TEMPLATE_TYPE.normal) {
        this.copyNormolTemplate()
      } else if (this.currentTemplate.type === TEMPLATE_TYPE.custom) {
        this.copyCustomTemplate()
      } else {
        log.error('模板类型错误')
        return
      }
    } else {
      this.copyNormolTemplate()
    }
  }

  async copyNormolTemplate () {
    const sourcePath = path.resolve(this.storeModulePath, 'template')
    const target = process.cwd()
    fse.ensureDirSync(sourcePath)
    fse.ensureDirSync(target)
    fse.copySync(sourcePath, target)
    log.success('🚀 模板已下载成功')
    this.renderTemplate()
  }

  renderTemplate () {
    glob(
      '**/*',
      {
        ignore: ['node_modules', 'public/index.html'],
        nodir: true,
        cwd: process.cwd()
      },
      (err, files) => {
        if (err) return
        files.forEach(async file => {
          const filePath = path.resolve(process.cwd(), file)
          const replaceTemplateString = await ejs.renderFile(
            filePath,
            {
              projectName: this.projectInfo.projectName,
              version: this.projectInfo.projectVersion
            },
            {}
          )
          fse.writeFileSync(filePath, replaceTemplateString, {})
        })
        // console.log(files)
      }
    )
  }

  async copyCustomTemplate () {
    //
  }
}

function init (argv) {
  return new InitCommand(argv)
}

module.exports = init
