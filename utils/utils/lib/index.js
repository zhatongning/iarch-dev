'use strict';
const path = require('path')

function pathFormat(p) {
  const sep = path.sep
  if (p && typeof p === 'string') {
    if (sep === '/') {
      return p
    } else {
      return p.replace(/\\/g, '/')
    }
  }
  return p
}


module.exports = {
  pathFormat
};