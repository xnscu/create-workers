<script setup>
import { useFetch } from '@vueuse/core'

const { data, isFetching, error, execute } = useFetch('/api/hello', {
  immediate: false,
})
</script>
<template>
  <h1>Good! Your cloudflare project is ready!</h1>
  <GlobalHello />
  <LocalHello />

  <div style="margin-top: 20px">
    <button @click="execute" :disabled="isFetching">
      {{ isFetching ? 'fetching...' : 'request /hello' }}
    </button>

    <div
      v-if="error"
      style="margin-top: 10px; padding: 10px; border: 1px solid #ff6b6b; background-color: #ffe0e0"
    >
      <strong>error:</strong>
      <pre>{{ error }}</pre>
    </div>

    <div
      v-if="data"
      style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; background-color: #f9f9f9"
    >
      <pre>{{ data }}</pre>
    </div>
  </div>
</template>

<style scoped></style>
