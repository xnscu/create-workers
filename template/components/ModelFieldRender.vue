<route lang="yaml"></route>
<script setup>
const props = defineProps({
  model: { type: Function },
  field: { type: Object, required: true },
  record: { type: Object, required: true },
  value: {},
});
const tagColorArray = ["geekblue", "orange", "green", "cyan", "red", "blue", "purple"];
const textTypes = {
  string: true,
  sfzh: true,
  email: true,
  password: true,
  text: true,
  integer: true,
  float: true,
  datetime: true,
  date: true,
  year_month: true,
  year: true,
  month: true,
  time: true,
  foreignkey: true,
  boolean: true,
};
const fieldValue = computed(() => props.value ?? props.record[props.field.name]);
const arrayLabelValue = computed(() => {
  if (props.field.choices) {
    return fieldValue.value.map((v) => props.field.choices.find((c) => c.value === v)?.label);
  } else {
    return fieldValue.value;
  }
});
const fkValue = computed(() => {
  const rc = props.field.reference_column;
  const rlc = props.field.reference_label_column;
  if (typeof fieldValue.value == "object") {
    if (rlc && fieldValue.value[rlc] !== undefined) {
      return fieldValue.value[rlc];
    } else {
      return fieldValue.value[rc];
    }
  } else {
    if (rlc && props.record[`${props.field.name}__${rlc}`] !== undefined) {
      return props.record[`${props.field.name}__${rlc}`];
    } else {
      return fieldValue.value;
    }
  }
});
const showDetail = ref(false);
const tableFieldColumns = computed(() => [
  { title: "#", key: "#" },
  ...(props.field.detail_columns || props.field.columns || props.field.model.names).map((name) => ({
    title: props.field.model.name_to_label[name],
    key: name,
  })),
]);
const avatarUrl = computed(() =>
  Array.isArray(fieldValue.value) ? fieldValue.value[0].ossUrl : fieldValue.value,
);
const previewVisible = ref(false);
const previewImage = () => {
  previewVisible.value = true;
};
const previewVisibles = ref([]);
const previewImages = (i) => {
  previewVisibles.value[i] = true;
};
</script>
<template>
  <template v-if="field.type === 'foreignkey'">
    {{ fkValue }}
  </template>
  <template v-else-if="field.type === 'json' && field.attrs.wx_lbs">
    {{ fieldValue ? `${fieldValue.name}（${fieldValue.address}）` : "" }}
  </template>
  <template v-else-if="field.type === 'boolean'">
    {{ fieldValue ? "是" : "否" }}
  </template>
  <template v-else-if="field.type === 'datetime'">
    {{ fieldValue?.slice(0, -6) }}
  </template>
  <template v-else-if="field.type === 'alioss_image' || field.media_type === 'image'">
    <img @click="previewImage" :src="avatarUrl" class="admin-list-avatar" style="cursor: pointer" />
    <a-modal v-model:visible="previewVisible" :footer="null" @cancel="previewVisible = false">
      <img style="width: 100%" :src="avatarUrl" />
    </a-modal>
  </template>
  <template v-else-if="field.type === 'alioss_image_list'">
    <div v-for="(url, i) in fieldValue" :key="i" style="margin-bottom: 1em">
      <img @click="previewImages(i)" :src="url" class="admin-list-avatar" style="cursor: pointer" />
      <a-modal
        v-model:visible="previewVisibles[i]"
        :footer="null"
        @cancel="previewVisibles[i] = false"
      >
        <img style="width: 100%" :src="url" />
      </a-modal>
    </div>
  </template>
  <template v-else-if="field.media_type === 'video'">
    <video v-if="fieldValue" controls width="250">
      <source :src="fieldValue" />
    </video>
  </template>
  <template v-else-if="field.type === 'text'">
    <a-button v-if="field.attrs?.rich" type="link" size="small" @click="showDetail = true"
      >查看</a-button
    >
    <div v-else-if="field.attrs?.html" v-html="fieldValue"></div>
    <pre v-else style="white-space: pre-wrap; word-wrap: break-word">{{ fieldValue }}</pre>
  </template>
  <template v-else-if="field.type === 'array'">
    <template v-if="field.field">
      <div v-for="(e, i) in fieldValue" :key="i" style="margin-bottom: 2px">
        <a-tag v-if="textTypes[field.field.type]" :color="tagColorArray[i % tagColorArray.length]">
          {{ `${i + 1}. ${e}` }}
        </a-tag>
        <template v-else>
          <a-row>
            <a-col flex="none">{{ `${i + 1}.` }}</a-col>
            <a-col flex="auto">
              <model-field-render :field="field.field" :record="{}" :value="e"></model-field-render
            ></a-col>
          </a-row>
        </template>
      </div>
    </template>
    <template v-else>
      <p v-for="(v, i) in arrayLabelValue" :key="i">{{ v }}</p>
    </template>
  </template>
  <template v-else-if="field.type === 'table'">
    <a-table :dataSource="fieldValue" :columns="tableFieldColumns" :pagination="false">
      <template #bodyCell="{ text, record, index, column }">
        <template v-if="column.key === '#'">{{ index + 1 }}</template>
        <template v-else>
          <model-field-render
            :field="field.model.fields[column.key]"
            :value="record[column.key]"
            :record="record"
          ></model-field-render>
        </template>
      </template>
    </a-table>
  </template>
  <template v-else-if="Array.isArray(field.choices) && field.choices.length">
    {{ field.choices.find((c) => c.value === fieldValue)?.label || fieldValue }}
  </template>
  <template v-else>
    {{ fieldValue }}
  </template>
  <a-modal
    v-model:visible="showDetail"
    title="详情"
    @cancel="showDetail = false"
    :maskClosable="true"
    closable
    width2="1000px"
  >
    <div v-if="field.attrs?.rich" v-html="fieldValue" style="width: 100%"></div>
    <template #footer> </template>
  </a-modal>
</template>

<style scoped>
:deep(img) {
  width: 100%;
}

.admin-list-avatar {
  max-width: 100px;
  max-height: 100px;
}
</style>
