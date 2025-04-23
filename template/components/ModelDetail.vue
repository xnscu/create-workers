<route lang="yaml"></route>
<script setup>
import { computed, ref, createVNode } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Modal } from "ant-design-vue";

const props = defineProps({
  model: { type: [Object, Function], required: true },
  record: { type: Object, required: true },
  detailNames: {
    type: Array,
    default(props) {
      return props.model.admin?.detail_names || props.model.field_names;
    },
  },
  detailLabelCol: {
    type: Number,
    default(props) {
      const maxLabelLength = Math.max(
        ...props.detailNames.map((name) => props.model.fields[name]?.label?.length || 0),
      );
      return Math.min(maxLabelLength + 1, 9);
    },
  },
});
const detailFields = computed(() => {
  const fields = [];
  for (const name of props.detailNames) {
    const field = props.model.fields[name];
    fields.push(field);
  }
  return fields;
});
</script>
<template>
  <template v-for="(field, i) in detailFields" :key="field.name">
    <a-row :class="`detail-bg-${i % 2}`">
      <a-col :span="detailLabelCol" class="detail-col">{{ field.label }}</a-col>
      <a-col class="detail-col" style="text-align: left" flex="auto" :span="24 - detailLabelCol">
        <model-field-render :record="record" :field="field" :model="model"></model-field-render>
        <slot name="afterValue" v-bind="{ record, field, model }"> </slot>
      </a-col>
    </a-row>
  </template>
</template>

<style scoped>
.detail-bg-0 {
  background-color: #eee;
}

.detail-col {
  text-align: right;
  padding: 0.5em;
}
</style>
