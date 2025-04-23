<template>
  <div ref="scrollContainer" class="scroll-container">
    <button @click="pageUp">向上翻页</button>
    <slot v-for="(item, index) in visibleItems" :key="index" :item="item"></slot>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useScroll } from "@vueuse/core";

const props = defineProps({
  list: {
    type: Array,
    required: true,
  },
  n: {
    type: Number,
    required: true,
  },
});

const startIndex = ref(0);
const pageUp = () => {
  startIndex.value -= props.n;
  if (startIndex.value < 0) {
    startIndex.value = 0;
  }
};
const visibleItems = computed(() => {
  return props.list.slice(startIndex.value, startIndex.value + props.n);
});
const scrollContainer = ref(null);
const { x, y, isScrolling, arrivedState, directions } = useScroll(scrollContainer);
const { left, right, top, bottom } = toRefs(arrivedState);
const { left: toLeft, right: toRight, top: toTop, bottom: toBottom } = toRefs(directions);

watch(bottom, (v) => {
  if (!isScrolling.value) {
  }
  if (v) {
    console.log("向后翻页");
    startIndex.value += props.n;
    setTimeout(() => {
      scrollContainer.value.scrollTop = 0;
    }, 200);
  }
});
watch(top, (v) => {
  if (!isScrolling.value) {
  }
  if (v) {
    // console.log("aaa", startIndex.value - props.n);
    // if (startIndex.value - props.n > 0) {
    //   console.log("向前翻页");
    //   startIndex.value -= props.n;
    // }
  }
});
</script>

<style scoped>
.scroll-container {
  /* height: 800px; */
  overflow-y: auto;
  padding-bottom: 30em;
}
</style>
