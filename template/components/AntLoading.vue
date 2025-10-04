<template>
  <a-spin v-if="loading && !disableLoading" :indicator="indicator" />
</template>
<script lang="ts" setup>
import { LoadingOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'

const { loading, disableLoading } = useStore()
const indicator = h(LoadingOutlined, {
  style: {
    fontSize: '3em',
    fontWeight: 'bold',
  },
  spin: true,
})
</script>

<style scoped>
.ant-spin {
  position: absolute;
  top: 25%;
  left: 50%;
  z-index: 10;
}
</style>
