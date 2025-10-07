这是一个cloudflare workers项目，技术栈：pnpm + vite + vue3 + vueuse + primevue，后端api文件在worker文件夹下。路由是基于文件名进行组织的，由scripts/build-routes.mjs生成。
我是在github codespaces里面运行你的，所以你想干什么就干什么，不用停下来问我。
components放的是和业务无关的全局组件，src/components放的是业务相关的全局组件。
composables放的是和业务无关的全局组合式函数，src/composables放的是业务相关的全局组合式函数。
globals/index.js和src/globals/index.js里面导出的是全局可用的，前者是业务无关，后者业务相关。
lib放的是基础库文件。其中ClassView.mjs是原理类似于django classview的控制器生成类。Router.mjs实现了路由算法。而utils.mjs则存放了各种业务无关的辅助函数。
src文件夹是经典的vue工程结构。
由于使用了unplugin-vue-router/vite，src/views里面的vue文件会自动注册为同名路由，不用手动添加。
worker文件夹存放的是后端api文件，scripts/build-routes.mjs会扫描这里面的js/mjs文件（除index.mjs之外），这些文件的default导出必须是函数（比如funcview.mjs）或ClassView子类（比如classview.mjs），再结合文件名注册路由到Router类，最后生成worker/index.mjs文件，这是本项目的请求处理核心，从这里可以看到，凡是以/api/开头的请求都会尝试在后端匹配，匹配的时候又删掉/api前缀再匹配，比如/api/funcview会匹配到worker/funcview.mjs文件，/api/classview会匹配到classview.mjs文件。
优先使用vueuse，尽量不要自己造轮子。比如判断移动端使用@vueuse/core里面的useWindowSize。
vue组件的编写请遵循社区最佳实践：https://vuejs.org/style-guide/。
