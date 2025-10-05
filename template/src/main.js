import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { Model } from 'xodel/lib/model.mjs'
import { BaseField } from 'xodel/lib/fields.mjs'
import { request } from '~/lib/http'
import 'ant-design-vue/dist/reset.css'

Model.request = request
BaseField.request = request
const app = createApp(App)

app.use(router)

app.mount('#app')
app.config.errorHandler = (error, instance, info) => {
  console.error('global error captured:', error.message)
  if (typeof error == 'object') {
    if (error.name == 'AxiosError' && error.response) {
      const { data, status, request } = error.response
      // console.log("AxiosError:", { data, status, request });
      if (status == 403) {
        const [_, url] = request.responseURL.match(/https?:\/\/[^/]+(.+)/)
        const realUrl =
          process.env.NODE_ENV === 'production'
            ? url
            : url.slice(process.env.VITE_PROXY_PREFIX.length)
        Notice.error('需要登录')
        return router.push({
          name: realUrl.startsWith('/admin') ? 'AdminUserLogin' : 'UserLogin',
          query: {
            redirect: router.currentRoute.value.fullPath,
          },
        })
      } else if (error.response.data) {
        return Notice.error(error.response.data)
      }
    } else if (error.message !== '') {
      return Notice.error(error.message)
    } else {
      return Notice.error(error)
    }
  }
  Notice.error(typeof error == 'object' ? error.message : error)
}
