'use strict'

const path = require('path')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const npminstall = require('npminstall')
const fse = require('fs-extra')
const { pathFormat } = require('@imooc-night-dev/utils')
const log = require('@imooc-night-dev/log')
const {
  getRegisty,
  getLatestVersion
} = require('@imooc-night-dev/get-npm-info')

class Package {
  constructor (options = {}) {
    this.targetPath = options.targetPath
    this.storePath = options.storePath
    this.pkgName = options.pkgName
    this.pkgVersion = options.pkgVersion
    this.silence = options.silence

    this.pkgNameNoSlash = this.pkgName.replace('/', '_')
    this.pkgPrefixName = this.pkgName.split('/')[0]
  }

  async prepare () {
    if (this.storePath && !pathExists(this.storePath)) {
      fse.mkdirpSync(this.storePath)
    }
    if (this.pkgVersion === 'latest') {
      this.pkgVersion = await getLatestVersion(this.pkgName)
    }
  }

  getCacheModuleNameByVersion (version) {
    return `_${this.pkgNameNoSlash}@${version}@${this.pkgPrefixName}`
  }

  async exist () {
    if (this.storePath) {
      await this.prepare()
      const latestModuleName = this.getCacheModuleNameByVersion(this.pkgVersion)
      return pathExists(path.resolve(this.storePath, latestModuleName))
    } else {
      return pathExists(this.targetPath)
    }
  }

  async install () {
    !this.silence &&
      log.info(this.pkgName, `prepare to install package ${this.pkgName}`)
    await this.prepare()
    await npminstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: getRegisty(),
      pkgs: [
        {
          name: this.pkgName,
          version: this.pkgVersion
        }
      ]
    })
  }

  async update () {
    const latestVerison = await getLatestVersion(this.pkgName)
    const latestModuleName = this.getCacheModuleNameByVersion(latestVerison)
    if (!pathExists(path.resolve(this.storePath, latestModuleName))) {
      !this.silence &&
        log.info(this.pkgName, `updating to ${latestVerison} ...`)
      await npminstall({
        root: this.targetPath,
        storeDir: this.store,
        registry: getRegisty(),
        pkgs: [
          {
            name: this.pkgName,
            version: latestVerison
          }
        ]
      })
      this.pkgVersion = latestVerison
    } else {
      !this.silence && log.info(this.pkgName, 'already the latest version ...')
    }
  }

  getRootPath () {
    const rootDir = pkgDir(this.targetPath)
    if (rootDir) {
      const rootPkg = path.resolve(rootDir, 'package.json')
      if (pathExists(rootPkg)) {
        const mainFile = require(rootPkg).main
        if (mainFile) {
          return pathFormat(path.resolve(rootDir, mainFile))
        }
      }
    }
    return null
  }
}

module.exports = Package
