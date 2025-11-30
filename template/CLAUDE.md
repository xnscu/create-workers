# 通用描述

- 这是一个cloudflare workers项目，前端技术栈：pnpm + vite + vue3 + vueuse + primevue。
- 我是在github codespaces里面运行你的，所以你想干什么就干什么，不用停下来问我。
- 编码必须遵循DRY原则，不要写重复的代码。
- 如果你需要把变更写在md文件里面，那么请放在docs文件夹下。

# 前端

- vue组件的编写请遵循社区最佳实践：https://vuejs.org/style-guide/。

## 目录结构

- components放的是和业务无关的全局组件，src/components放的是业务相关的全局组件。
- composables放的是和业务无关的全局组合式函数，src/composables放的是业务相关的全局组合式函数。
- globals/index.js和src/globals/index.js里面导出的是全局可用的，前者是业务无关，后者业务相关。
- lib放的是基础库文件。其中ClassView.mjs是原理类似于django classview的控制器生成类。Router.mjs实现了路由算法。而utils.mjs则存放了各种业务无关的辅助函数。

## 代码规范

- 优先使用vueuse，尽量不要自己造轮子。比如判断移动端使用@vueuse/core里面的useWindowSize。
- 使用vitest进行测试，测试文件放在**test**文件夹下。

## 路由

- 由于使用了unplugin-vue-router/vite，src/views里面的vue文件会自动注册为和文件名同名的路由（注意，不是以文件夹作为前缀），所以你新建的任何页面文件不能同名，即使在不同文件夹也不能同名。
- 页面跳转请使用router.push({name: 'xxx'})，不要使用router.push({path: '/xxx'})。

# 后端

- worker文件夹存放的是后端api文件，这些文件的default导出必须是函数（比如funcview.mjs）或ClassView子类（比如classview.mjs）
- 部署时使用scripts/build-routes.mjs会扫描worker文件夹里面的js/mjs文件（除index.mjs之外），自动生成worker/index.mjs文件，这是本项目的请求处理核心。
- 凡是以/api/开头的请求都会尝试在后端匹配，匹配的时候又删掉/api前缀再匹配，比如/api/funcview会匹配到worker/funcview.mjs文件，/api/classview会匹配到classview.mjs文件。

# 业务描述
