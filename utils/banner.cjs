const s = require('gradient-string')([
  { color: '#42d392', pos: 0 },
  { color: '#42d392', pos: 0.1 },
  { color: '#647eff', pos: 1 }
])('create-workers - Start an opinioned vite project')

console.log(JSON.stringify(s))
