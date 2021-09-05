const fetch = require('node-fetch')
const semver = require('semver')

const defaultRegistryUrl = 'https://registry.npmjs.org'
const taobaoRegistryUrl = 'https://registry.npm.taobao.org'

function getRegisty(isLocal) {
  return isLocal ? taobaoRegistryUrl : defaultRegistryUrl
}

function getNpmInfo(pkgName, registry = getRegisty(true)) {
  return fetch(`${registry}/${pkgName}`)
  .then(res => res.json())
  .catch(e => {
    Promise.reject(e)
  })
}

async function getNpmAllVersions(pkgName) {
  const pkgInfo = await getNpmInfo(pkgName)
  if (pkgInfo && pkgInfo.versions) {
    return Object.keys(pkgInfo.versions)
  }
}

async function getNpmVersionsByBenchmark(pkgName, benchmark) {
  try {
    const versions = await getNpmAllVersions(pkgName)
    versions.filter(v => semver.satisfies(v, benchmark))
      .sort((a, b) => semver.gt(b, a))
  } catch(e) {
    return e
  }
}

async function getLatestVersion(pkgName) {
  try {
    const versions = await getNpmAllVersions(pkgName)
    if (versions && versions.length) {
      return versions.sort((v1, v2) => (semver.lt(v2, v1) ? -1 : 1))[0]
    }
  } catch (e) {
    return e
  }
}


module.exports = {
  getRegisty,
  getNpmInfo,
  getNpmAllVersions,
  getNpmVersionsByBenchmark,
  getLatestVersion
};
