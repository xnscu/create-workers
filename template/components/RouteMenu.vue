<script setup>
import { RouterLink } from "vue-router";
const props = defineProps({
  name: { type: String, default: "" },
  params: { type: Object },
  query: { type: Object },
});
</script>
<template>
  <a-menu-item :key="props.name">
    <router-link :to="{ ...props }">
      <span>
        <slot />
      </span>
    </router-link>
  </a-menu-item>
</template>
