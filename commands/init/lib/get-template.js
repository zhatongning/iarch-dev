const request = require('@imooc-night-dev/request')

function getTemplate () {
  return request().get('/package/templates')
}

module.exports = getTemplate
