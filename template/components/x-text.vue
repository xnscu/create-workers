<template>
  <div>
    <template v-for="(line, i) in lines" :key="i">
      <div v-if="line" class="padding color" style="line-height: 200%">
        <div
          :class="{ indent: firstLineNoIndent ? i > 0 : true, size: true }"
          :selectable="true"
          :userSelect="true"
        >
          {{ line }}
        </div>
      </div>
      <br v-else />
    </template>
  </div>
</template>

<script setup>
const props = defineProps(["text", "size", "indent", "color", "padding", "firstLineNoIndent"]);
const textIndent = props.indent || "2em";
const fontSize = props.size || "36rpx";
const padding = props.padding || "10rpx 5rpx";
const color = props.color || "black";
const lineHeight = props.lineHeight || "120%";
const firstLineNoIndent = props.firstLineNoIndent;
const lines = computed(() =>
  props.text
    .replace("\r\n", "\n")
    .split("\n")
    .map((line) => line.trim()),
);
log(lines);
</script>

<style scoped>
.indent {
  text-indent: v-bind(textIndent);
}
.size {
  font-size: v-bind(fontSize);
}
.padding {
  padding: v-bind(padding);
}
.color {
  color: v-bind(color);
}
</style>
