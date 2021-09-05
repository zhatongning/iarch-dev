'use strict'
const axios = require('axios')

const baseURL = process.env.IMOOC_CLI_BASEURL || 'http://127.0.0.1:7001'

const instance = axios.create({
  baseURL
})

instance.interceptors.response.use(
  res => {
    return res.data
  },
  err => {
    return Promise.reject(err)
  }
)

function request () {
  return instance
}

module.exports = request
