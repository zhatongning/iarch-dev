'use strict'

const npmlog = require('npmlog')

// 自定义log 等级
npmlog.addLevel('success', { fg: 'green', bg: 'pink' })

npmlog.level = process.env.LOG_LEVEL

npmlog.heading = 'imooc-night-dev'

module.exports = npmlog
