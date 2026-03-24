const hostname = window.location.hostname
const port = window.location.port

const getAPIUrl = () => {
  // localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000'
  }

  // direct IP access — detect by port which frontend is calling
  if (hostname === '10.1.19.109') {
    if (port === '3000') return 'http://10.1.19.109:4000'  // dev
    if (port === '3001') return 'http://10.1.19.109:4001'  // uat
    if (port === '3002') return 'http://10.1.19.109:4002'  // prod
    return 'http://10.1.19.109:4000'  // fallback
  }

  // domain URLs
  if (hostname.includes('dev-idamsliteuam')) {
    return 'http://api-dev-idamsliteuam.unichemlabs.com'
  }
  if (hostname.includes('uat-idamsliteuam')) {
    return 'http://api-uat-idamsliteuam.unichemlabs.com'
  }
  if (hostname === 'idamsliteuam.unichemlabs.com') {
    return 'http://api-idamsliteuam.unichemlabs.com'
  }

  return 'http://localhost:4000'  // fallback
}

const config = {
  API_BASE: getAPIUrl()
}

console.log('Hostname :', hostname)
console.log('Port     :', port)
console.log('API_BASE :', config.API_BASE)

export default config