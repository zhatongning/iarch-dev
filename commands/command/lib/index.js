'use strict'

class Command {
  constructor (options) {
    if (options === null) {
      throw new Error('init argv can not be null')
    }
    if (!Array.isArray(options) && options.length >= 2) {
      throw new Error('init argv must be Array')
    }
    this._argv = options
    let runner = new Promise((rs, rj) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain.catch(e => {
        return Promise.reject(e)
      })
    })
  }

  initArgs () {
    this.cmd = this._argv[this._argv.length - 1]
    this.cmdArgs = this._argv.slice(0, this._argv.length - 2)
    this.cmdOptions = this._argv[this._argv.length - 2]
  }

  init () {
    throw new Error('the init method must be implemented~')
  }

  exec () {
    throw new Error('the init method must be implemented~')
  }
}

module.exports = Command
