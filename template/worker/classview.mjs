import ClassView from '../lib/ClassView.mjs'

export default class view extends ClassView {
  async get(request, env, ctx) {
    return 'Hello, ClassView!'
  }
}
