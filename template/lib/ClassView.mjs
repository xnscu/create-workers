import { NotFoundError, MethodNotAllowedError } from './Router.mjs'
import Router from './Router.mjs'

export default class ClassView {
  static ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  static NotFoundError = NotFoundError
  static MethodNotAllowedError = MethodNotAllowedError

  constructor() {
    this.dispatch = this.dispatch.bind(this)
  }

  async dispatch(request, env, ctx) {
    const method = request.method.toUpperCase()
    const methodName = method.toLowerCase()
    if (typeof this[methodName] === 'function') {
      return await this[methodName](request, env, ctx)
    } else {
      return this.methodNotAllowed(request, env, ctx)
    }
  }

  methodNotAllowed(request, env, ctx) {
    const allowedMethods = this.getAllowedMethods()
    return Router.methodNotAllowedResponse(request, allowedMethods)
  }

  getAllowedMethods() {
    const methods = []
    for (const method of ClassView.ALLOWED_METHODS) {
      const methodName = method.toLowerCase()
      if (typeof this[methodName] === 'function') {
        methods.push(method)
      }
    }
    return methods
  }

  async head(request, env, ctx) {
    if (typeof this.get === 'function') {
      const response = await this.get(request, env, ctx)
      if (response instanceof Response) {
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      }
    }
    return this.methodNotAllowed(request, env, ctx)
  }

  async options(request, env, ctx) {
    const allowedMethods = this.getAllowedMethods()
    return new Response(null, {
      status: 200,
      headers: {
        Allow: allowedMethods.join(', '),
        'Content-Length': '0',
      },
    })
  }
}
