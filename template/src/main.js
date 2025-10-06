import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})
app.use(router)

app.mount('#app')
app.config.errorHandler = (error, instance, info) => {
  console.error('global error captured:', error)
  if (typeof error == 'object') {
    if (error.name == 'AxiosError') {
      if (error.response) {
        const { data, status, request } = error.response
        if (status == 403) {
          return console.error('AxiosError 403:', error)
        } else if (error.response.data) {
          return console.error('AxiosError message:', error.response.data)
        } else {
          return console.error('AxiosError response:', error)
        }
      } else {
        return console.error('AxiosError no response:', error.message)
      }
    } else if (error.message !== '') {
      return console.error(error.message)
    } else {
      return console.error(error)
    }
  }
}
