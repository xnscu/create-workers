// ES6 JavaScript version of router.lua

const METHOD_BITMASK = {
  GET: 1, // 2^0
  POST: 2, // 2^1
  PATCH: 4, // 2^2
  PUT: 8, // 2^3
  DELETE: 16, // 2^4
  HEAD: 32, // 2^5
  OPTIONS: 64, // 2^6
  CONNECT: 128, // 2^7
}

const DYNAMIC_SIGN = {
  35: true, // #
  58: true, // :
  60: true, // <
  42: true, // *
}

// 自定义错误类
class RouterError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'RouterError'
    this.statusCode = statusCode
  }
}

class NotFoundError extends RouterError {
  constructor(message = 'page not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

class MethodNotAllowedError extends RouterError {
  constructor(message = 'method not allowed') {
    super(message, 405)
    this.name = 'MethodNotAllowedError'
  }
}

function methods_to_bitmask(methods) {
  let bitmask = 0
  for (const method of methods) {
    bitmask |= METHOD_BITMASK[method.toUpperCase()]
  }
  return bitmask
}

function is_static_path(path) {
  const parts = path.split('/').filter((part) => part.length > 0)
  for (const part of parts) {
    if (DYNAMIC_SIGN[part.charCodeAt(0)]) {
      return false
    }
  }
  return true
}

function set_match_methods(tree) {
  if (!tree.children) {
    return
  }

  const methods = []
  const number_methods = []
  const regex_methods = []
  const char_methods = []
  const fallback_methods = []

  for (const [key, child] of Object.entries(tree.children)) {
    const pkey = key.substring(1)
    const bkey = key.charCodeAt(0)

    if (bkey === 35) {
      // '#'
      number_methods.push((node, part, params) => {
        const n = Number(part)
        if (!isNaN(n)) {
          params[pkey] = n
          return node.children[key]
        }
      })
    } else if (bkey === 60) {
      // '<'
      const pair_index = key.indexOf('>', 1)
      const regex = key.substring(pair_index + 1)
      const regex_key = key.substring(1, pair_index)
      regex_methods.push((node, part, params) => {
        try {
          const match = part.match(new RegExp(regex))
          if (match) {
            params[regex_key] = match[0]
            return node.children[key]
          }
        } catch (err) {
          // Invalid regex, skip
        }
      })
    } else if (bkey === 58) {
      // ':'
      char_methods.push((node, part, params) => {
        params[pkey] = part
        return node.children[key]
      })
    } else if (bkey === 42) {
      // '*'
      tree.match_rest = true
      fallback_methods.push((node, part, params) => {
        params[pkey] = part
        return node.children[key]
      })
    }

    set_match_methods(child)
  }

  // Combine all method groups in priority order
  const all_groups = [number_methods, regex_methods, char_methods, fallback_methods]
  for (const group of all_groups) {
    methods.push(...group)
  }

  if (methods.length > 0) {
    if (methods.length === 1) {
      tree.match_keys = methods[0]
    } else {
      tree.match_keys = (node, part, params) => {
        for (const func of methods) {
          const child = func(node, part, params)
          if (child) {
            return child
          }
        }
      }
    }
  }
}

class Router {
  static NotFoundError = NotFoundError
  static MethodNotAllowedError = MethodNotAllowedError

  constructor() {
    this.children = {}
    this.method_bitmask = METHOD_BITMASK
  }

  static new() {
    return new Router()
  }

  static create(routes) {
    const tree = new Router()
    for (const route of routes) {
      tree.is_route(route)

      const path = route[0]
      if (typeof path === 'string') {
        tree._insert(path, route[1], route[2])
      } else {
        for (const p of path) {
          tree._insert(p, route[1], route[2])
        }
      }
    }
    set_match_methods(tree)
    return tree
  }

  static createErrorResponse(statusCode, error, message, extra = {}) {
    const response = {
      error,
      message,
      ...extra,
    }

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  }

  static notFoundResponse(message = 'Not Found') {
    return Router.createErrorResponse(404, 'Not Found', message)
  }

  static methodNotAllowedResponse(request, allowedMethods = []) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
    }

    if (allowedMethods.length > 0) {
      headers['Allow'] = allowedMethods.join(', ')
    }

    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
        message: `Method ${request.method} is not allowed for this endpoint`,
        allowed_methods: allowedMethods,
      }),
      {
        status: 405,
        headers,
      },
    )
  }

  static internalServerErrorResponse(message = 'An unexpected error occurred') {
    return Router.createErrorResponse(500, 'Internal Server Error', message)
  }

  static badRequestResponse(message = 'Bad Request') {
    return Router.createErrorResponse(400, 'Bad Request', message)
  }

  static unauthorizedResponse(message = 'Unauthorized') {
    return Router.createErrorResponse(401, 'Unauthorized', message)
  }

  static forbiddenResponse(message = 'Forbidden') {
    return Router.createErrorResponse(403, 'Forbidden', message)
  }

  is_handler(handler) {
    if (typeof handler === 'function' || typeof handler === 'string') {
      return true
    }
    if (typeof handler.call !== 'function' && typeof handler !== 'function') {
      throw new RouterError('route handler is not a callable object')
    }
    return true
  }

  is_route(view) {
    if (!Array.isArray(view)) {
      throw new RouterError('route must be an array')
    }

    if (Array.isArray(view[0])) {
      if (view[0].length === 0) {
        throw new RouterError("if the first element of route is an array, it can't be empty")
      }
      for (const p of view[0]) {
        if (typeof p !== 'string') {
          throw new RouterError(`the path should be a string, not ${typeof p}`)
        }
      }
    } else if (typeof view[0] !== 'string') {
      throw new RouterError(
        `the first element of route should be a string or array, not ${typeof view[0]}`,
      )
    }

    if (view[2] !== undefined) {
      if (typeof view[2] === 'string') {
        if (!METHOD_BITMASK[view[2].toUpperCase()]) {
          throw new RouterError(`invalid http method: ${view[2]}`)
        }
      } else if (Array.isArray(view[2])) {
        for (const method of view[2]) {
          if (typeof method !== 'string') {
            throw new RouterError(
              `the methods array should contain string only, not ${typeof method}`,
            )
          }
          if (!METHOD_BITMASK[method.toUpperCase()]) {
            throw new RouterError(`invalid http method: ${method}`)
          }
        }
      } else {
        throw new RouterError(`the method should be a string or array, not ${typeof view[2]}`)
      }
    }

    return this.is_handler(view[1])
  }

  insert(path, handler, methods) {
    if (Array.isArray(path)) {
      if (handler === undefined) {
        this.is_route(path)
        return this.insert(...path)
      } else {
        let node
        for (const p of path) {
          node = this.insert(p, handler, methods)
        }
        return node
      }
    } else {
      this.is_route([path, handler, methods])
      const node = this._insert(path, handler, methods)
      set_match_methods(this)
      return node
    }
  }

  _insert(path, handler, methods) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node = this

    if (is_static_path(path)) {
      if (!node[path]) {
        node[path] = {}
      }
      node = node[path]
    } else {
      const parts = path.split('/').filter((part) => part.length > 0)
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (!node.children) {
          node.children = {}
        }
        if (!node.children[part]) {
          node.children[part] = {}
        }
        node = node.children[part]

        // 检查是否是 '*' 通配符
        if (part.startsWith('*')) {
          if (i !== parts.length - 1) {
            throw new RouterError(
              'Catch-all routes are only supported as the last part of the path',
            )
          }
          break
        }
      }
    }

    if (!handler) {
      throw new RouterError('you must provide a handler')
    }
    node.handler = handler

    if (typeof methods === 'string') {
      node.methods = METHOD_BITMASK[methods.toUpperCase()]
    } else if (Array.isArray(methods)) {
      node.methods = methods_to_bitmask(methods)
    }

    return node
  }

  match(path, method) {
    let params

    // First try static match
    let node = this[path]
    if (!node) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      node = this
      let cut = 1
      const parts = path.split('/').filter((part) => part.length > 0)

      for (const part of parts) {
        if (node.children && node.children[part]) {
          node = node.children[part]
        } else if (node.match_keys) {
          if (!params) {
            params = {}
          }
          if (!node.match_rest) {
            node = node.match_keys(node, part, params)
            if (!node) {
              throw new NotFoundError()
            }
          } else {
            node = node.match_keys(node, path.substring(cut), params)
            if (!node) {
              throw new NotFoundError()
            } else {
              break
            }
          }
        } else {
          throw new NotFoundError()
        }
        cut += part.length + 1
      }
    }

    if (!node.handler) {
      // defined /update/#id, but match /update
      throw new NotFoundError()
    }

    if (!node.methods) {
      return { handler: node.handler, params }
    }

    const method_bit = METHOD_BITMASK[method.toUpperCase()]
    if ((node.methods & method_bit) !== 0) {
      return { handler: node.handler, params }
    } else {
      throw new MethodNotAllowedError()
    }
  }
  post(path, handler) {
    return this.insert(path, handler, 'POST')
  }

  get(path, handler) {
    return this.insert(path, handler, 'GET')
  }

  patch(path, handler) {
    return this.insert(path, handler, 'PATCH')
  }

  put(path, handler) {
    return this.insert(path, handler, 'PUT')
  }

  delete(path, handler) {
    return this.insert(path, handler, 'DELETE')
  }

  head(path, handler) {
    return this.insert(path, handler, 'HEAD')
  }

  options(path, handler) {
    return this.insert(path, handler, 'OPTIONS')
  }

  connect(path, handler) {
    return this.insert(path, handler, 'CONNECT')
  }
}

export default Router
export { RouterError, NotFoundError, MethodNotAllowedError }
