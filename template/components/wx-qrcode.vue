<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({
  width: {
    type: Number,
    default: 250,
  },
  url: {
    type: String,
    required: true,
  },
});

const imgSrc = ref("");

const miniUrl = `https://${process.env.VITE_HOST}/q/WebProxy?url=${props.url}`;
const byQrcode = async () => {
  imgSrc.value = await getQRcode(miniUrl, { width: props.width });
};
onMounted(async () => {
  await byQrcode();
});
</script>

<template>
  <div :style="{ width: width + 'px', margin: 'auto' }">
    <h1 class="center">使用微信扫码</h1>
    <img v-if="imgSrc" :src="imgSrc" :style="{ width: width + 'px' }" />
  </div>
</template>
