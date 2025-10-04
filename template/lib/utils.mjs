import { Buffer } from 'buffer'

export function isWeixin() {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.match(/MicroMessenger/i) == 'micromessenger') {
    return true
  } else {
    return false
  }
}
export function chunk(elements, n = 1) {
  const res = []
  let unit = []
  for (const e of elements) {
    if (unit.length === n) {
      res.push(unit)
      unit = [e]
    } else {
      unit.push(e)
    }
  }
  res.push(unit)
  return res
}

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)
export const encodeBase64 = (s) =>
  Buffer.from(s, 'utf-8').toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
export const decodeBase64 = (s) =>
  Buffer.from(s.replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString('utf-8')
export const repr = (s) => {
  const res = JSON.stringify(s)
  console.log(res)
  return res
}
export const fromNow = (value) => {
  if (!value) {
    return ''
  }
  // 拿到当前时间戳和发布时的时间戳
  const curTime = new Date()
  const postTime = new Date(value)
  //计算差值
  const timeDiff = curTime.getTime() - postTime.getTime()
  // 单位换算
  const min = 60 * 1000
  const hour = min * 60
  const day = hour * 24
  // 计算发布时间距离当前时间的 天、时、分
  const exceedDay = Math.floor(timeDiff / day)
  const exceedHour = Math.floor(timeDiff / hour)
  const exceedMin = Math.floor(timeDiff / min)
  // 最后判断时间差
  if (exceedDay < 1) {
    if (exceedHour < 24 && exceedHour > 0) {
      return exceedHour + '小时前'
    } else if (exceedMin < 60 && exceedMin > 0) {
      return exceedMin + '分钟前'
    } else {
      return '刚刚'
    }
  } else if (exceedDay < 7) {
    return `${exceedDay}天前`
  } else if (curTime.getFullYear() == postTime.getFullYear()) {
    return value.slice(5, 10)
  } else {
    return value.slice(0, 10)
  }
}
export function uuid() {
  let timestamp = new Date().getTime()
  let perforNow =
    (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let random = Math.random() * 16
    if (timestamp > 0) {
      random = (timestamp + random) % 16 | 0
      timestamp = Math.floor(timestamp / 16)
    } else {
      random = (perforNow + random) % 16 | 0
      perforNow = Math.floor(perforNow / 16)
    }
    return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}
const FIRST_DUP_ADDED = {}
export const findDups = (arr, callback) => {
  const already = {}
  const res = []
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i]
    const k = callback(e, i, arr)
    const a = already[k]
    if (a !== undefined) {
      if (a !== FIRST_DUP_ADDED) {
        res.push(a)
        already[k] = FIRST_DUP_ADDED
      }
      res.push(e)
    } else {
      already[k] = e
    }
  }
  return res
}
export function objectContains(a, b) {
  for (const key in b) {
    if (Object.hasOwnProperty.call(b, key)) {
      if (!isSame(a[key], b[key])) {
        return false
      }
    }
  }
  return true
}
export function isSame(a, b) {
  if (typeof a !== typeof b) {
    return false
  }
  if (typeof a !== 'object') {
    return a === b
  }
  if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) {
      return false
    }
    for (let i = a.length - 1; i >= 0; i--) {
      if (!isSame(a[i], b[i])) {
        return false
      }
    }
    return true
  }
  if (a instanceof Array || b instanceof Array) {
    return false
  }
  return objectContains(a, b) && objectContains(b, a)
}
const sizeTable = {
  k: 1024,
  m: 1024 * 1024,
  g: 1024 * 1024 * 1024,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
}
export function parseSize(t) {
  if (typeof t === 'string') {
    const unit = t.replace(/^(\d+)([^\d]+)$/, '$2').toLowerCase()
    const ts = t.replace(/^(\d+)([^\d]+)$/, '$1').toLowerCase()
    const bytes = sizeTable[unit]
    if (!bytes) throw new Error('invalid size unit: ' + unit)
    const num = parseFloat(ts)
    if (isNaN(num)) throw new Error("can't convert `" + ts + '` to a number')
    return num * bytes
  } else if (typeof t === 'number') {
    return t
  } else {
    throw new Error('invalid type: ' + typeof t)
  }
}
export const snakeToCamel = (s) => {
  return s.replace(/(_[a-zA-Z])/g, (c) => {
    return c[1].toUpperCase()
  })
}

export const toModelName = (s) => {
  return capitalize(snakeToCamel(s))
}

export const toChineseDatetime = (s) => {
  return `${s.slice(0, 4)}年${s.slice(5, 7)}月${s.slice(8, 10)}日${s.slice(11, 13)}点${s.slice(
    14,
    16,
  )}分`
}

export const deepcopy = (o) => JSON.parse(JSON.stringify(o))

const unit_table = {
  s: 1,
  m: 60,
  h: 3600,
  d: 3600 * 24,
  w: 3600 * 24 * 7,
  M: 3600 * 24 * 30,
  y: 3600 * 24 * 365,
}
export function timeParser(t) {
  if (typeof t === 'string') {
    const unit = t[t.length - 1]
    const secs = unit_table[unit]
    if (!secs) throw 'invalid time unit: ' + unit
    const ts = t.substring(0, t.length - 1)
    const num = Number(ts)
    if (!num) throw "can't convert '" + (ts + "' to a number")
    return num * secs
  } else if (typeof t === 'number') {
    return t
  } else {
    throw new Error('invalid type:' + typeof t)
  }
}

function centerLeftRankEven(arr) {
  const res = []
  const n = arr.length
  for (let i = n - 1; i >= 1; i = i - 2) {
    res.push(arr[i])
  }
  for (let i = 0; i <= n - 2; i = i + 2) {
    res.push(arr[i])
  }
  return res
}

export function centerLeftRank(arr) {
  const n = arr.length
  if (n % 2 === 0) {
    return centerLeftRankEven(arr)
  } else {
    const res = centerLeftRankEven(arr.slice(1))
    res.splice((n - 1) / 2, 0, arr[0])
    return res
  }
}

export function dataMasking(value) {
  return (
    value[0] +
    Array(value.length - 1)
      .fill('*')
      .join('')
  )
}

export function getChineseDate(date) {
  if (typeof date == 'string') {
    date = new Date(date)
  }
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${year}年${month}月${day}日 ${hour}:${minute}`
}

export function convertToVCF(name, phoneNumber, org) {
  const vcfData = `BEGIN:VCARD
VERSION:3.0
N:${name}
FN:${name}
TEL;TYPE=CELL:${phoneNumber}
ORG:${org}办公室
END:VCARD

`
  return vcfData
}

export function getWeekNumber(date = new Date()) {
  // 创建日期副本,避免修改原始日期
  const target = new Date(date.valueOf())

  // 获取一年中的第一天
  const firstDayOfYear = new Date(target.getFullYear(), 0, 1)

  // 将第一天调整到最近的周日
  const firstWeekday = firstDayOfYear.getDay()
  firstDayOfYear.setDate(firstDayOfYear.getDate() - firstWeekday)

  // 计算目标日期与第一周起始日期的天数差
  const diff = target - firstDayOfYear
  const oneDay = 24 * 60 * 60 * 1000 // 一天的毫秒数
  const dayCount = Math.floor(diff / oneDay)

  // 计算周数并加1(因为第一周从1开始计数)
  const weekNumber = Math.floor(dayCount / 7) + 1

  return weekNumber
}

/**
 * 计算指定年份中某周某天对应的具体日期
 * @param {number} year - 年份
 * @param {number} week - 第几周 (1-53)
 * @param {number} day - 周几 (1-7, 1代表周一，7代表周日)
 * @returns {Date} 返回对应的日期
 */
export function getDateByWeekAndDay({ year = new Date().getFullYear(), week, day }) {
  // 参数验证
  if (week < 1 || week > 53) {
    throw new Error('Week must be between 1 and 53')
  }
  if (day < 1 || day > 7) {
    throw new Error('Day must be between 1 and 7')
  }

  // 获取该年第一天
  const firstDayOfYear = new Date(year, 0, 1)

  // 计算第一周的开始
  // 根据ISO 8601标准，每周从周一开始，并且包含1月4日的那周被定义为该年第1周
  const firstWeekday = firstDayOfYear.getDay() || 7 // 将周日的0转换为7
  const offsetToFirstMonday = firstWeekday <= 4 ? 1 - firstWeekday : 8 - firstWeekday

  // 计算目标日期
  const days = offsetToFirstMonday + (week - 1) * 7 + (day - 1)
  const targetDate = new Date(year, 0, 1 + days)
  const month = String(targetDate.getMonth() + 1).padStart(2, '0')
  const date = String(targetDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function removeSpace(s) {
  return s.replace(/\s/g, '')
}

export function stringifyError(error) {
  if (typeof error !== 'object' || error === null) {
    return String(error)
  }

  const seen = new WeakSet()

  function _stringify(obj, indent = '') {
    if (seen.has(obj)) {
      return '[Circular]'
    }
    seen.add(obj)

    const entries = Object.entries(obj)
    if (entries.length === 0) {
      return '{}'
    }

    const result = entries
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${indent}  ${key}: ${_stringify(value, indent + '  ')}`
        } else {
          return `${indent}  ${key}: ${String(value)}`
        }
      })
      .join('\n')

    return `{\n${result}\n${indent}}`
  }

  return _stringify(error)
}

// 将 ArrayBuffer 转换为 Base64 字符串
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary) // 转换为 Base64
}

// 添加类型前缀，生成 Data URL
export function arrayBufferToDataURL(buffer, mimeType) {
  const base64 = arrayBufferToBase64(buffer)
  return `data:${mimeType};base64,${base64}`
}

export class ImageProcessor {
  constructor(image) {
    this.image = image
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.canvas.width = image.width
    this.canvas.height = image.height
    this.ctx.drawImage(image, 0, 0)
  }

  applyBlackAndWhite() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = gray // R
      data[i + 1] = gray // G
      data[i + 2] = gray // B
    }

    this.ctx.putImageData(imageData, 0, 0)
    return this
  }

  applyThreshold(threshold = 128) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      const value = avg > threshold ? 255 : 0
      data[i] = value // Red
      data[i + 1] = value // Green
      data[i + 2] = value // Blue
    }

    this.ctx.putImageData(imageData, 0, 0)
    return this
  }

  adjustContrastAndBrightness(contrast = 1, brightness = 0) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * contrast + brightness // Red
      data[i + 1] = data[i + 1] * contrast + brightness // Green
      data[i + 2] = data[i + 2] * contrast + brightness // Blue
    }

    this.ctx.putImageData(imageData, 0, 0)
    return this
  }

  sharpenImage() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0] // 锐化卷积核
    const width = this.canvas.width
    const height = this.canvas.height

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0,
          g = 0,
          b = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const weight = kernel[(ky + 1) * 3 + (kx + 1)]
            r += data[idx] * weight
            g += data[idx + 1] * weight
            b += data[idx + 2] * weight
          }
        }
        const idx = (y * width + x) * 4
        data[idx] = Math.min(255, Math.max(0, r))
        data[idx + 1] = Math.min(255, Math.max(0, g))
        data[idx + 2] = Math.min(255, Math.max(0, b))
      }
    }

    this.ctx.putImageData(imageData, 0, 0)
    return this
  }

  getResult() {
    return this.canvas.toDataURL()
  }
}
