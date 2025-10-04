<route lang="yaml"></route>
<script setup>
import { computed, ref, createVNode } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal } from 'ant-design-vue'

const props = defineProps({
  model: { type: [Object, Function], required: true },
  values: { type: Object },
  successRoute: { type: Object },
  formLabelCol: { type: Number, default: 4 },
  actionUrl: { type: String },
})
const editNames = computed(() => props.formNames || props.model.admin?.form_names)
</script>
<template>
  <model-form
    :model="props.model"
    :names="editNames"
    :labelCol="props.formLabelCol"
    :successRoute="props.successRoute"
    :values="props.values || props.model.get_defaults()"
    :action-url="props.actionUrl"
  ></model-form>
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
