<script setup>
import { DownloadOutlined } from "@ant-design/icons-vue";
import XlsxReadButton from "~/components/XlsxReadButton.vue";

const { loading } = useStore();
const emit = defineEmits(["findDuplicates", "uploadRows", "successUpload", "read"]);
const props = defineProps({
  model: { type: [Object, Function], required: true },
  total: { type: Number },
  rows: { type: Array },
  uploadUrl: { type: String },
  uploadButtonText: { type: String },
  uploadButtonHint: { type: String },
  downloadUrl: { type: String },
  downloadMethod: { type: String, default: "post" },
  downloadButtonText: { type: String },
  uniqueKey: { type: [String, Array] },
  hideUpload: { type: Boolean, default: false },
  hideDownload: { type: Boolean, default: false },
  hideDownloadAll: { type: Boolean, default: true },
  // tableName: { type: String },
  // primaryKey: { type: String },
  names: { type: Array },
  // field_names: { type: Array, default: () => [] },
  // fields: { type: Object, default: () => ({}) },
  // label_to_name: { type: Object, default: () => ({}) },
  // name_to_label: { type: Object, default: () => ({}) },
});

// props.model为abstract时，比如tablefield的场景，modelUniqueKey不存在
const modelUniqueKey = computed(
  () =>
    props.uniqueKey ||
    props.model.unique_together?.[0] ||
    Object.values(props.model.fields).find((f) => f.unique)?.name,
);

const batchNames = computed(() => {
  const names =
    props.names || props.model.names.filter((name) => props.model.fields[name].type !== "table");
  if (Array.isArray(modelUniqueKey.value)) {
    const keys = [...names];
    for (const key of modelUniqueKey.value) {
      if (!names.includes(key)) {
        keys.unshift(key);
      }
    }
    return keys;
  } else if (modelUniqueKey.value) {
    return names.includes(modelUniqueKey.value) ? [...names] : [modelUniqueKey.value, ...names];
  } else {
    return [...names];
  }
});
const ensureUnique = (rows) => {
  const key = modelUniqueKey.value;
  if (key) {
    const uniqueCallback =
      typeof key == "string" ? (row) => row[key] : (row) => key.map((k) => row[k]).join("|");
    const dups = utils.findDups(rows, uniqueCallback);
    if (dups.length) {
      emit("findDuplicates", dups);
      const label =
        typeof key == "string"
          ? props.model.name_to_label[key]
          : key.map((k) => props.model.name_to_label[k]).join("+");
      const dupItems = dups.map((row) =>
        typeof key == "string" ? row[key] : key.map((k) => row[k]).join("+"),
      );
      throw new Error(`上传名单存在重复${label}:\n${[...new Set(dupItems)].join("\n")}`);
    }
  }
  return rows;
};

const ensureArray = (rows) => {
  if (Array.isArray(rows)) {
    return rows;
  } else if (Number.isInteger(rows.affected_rows)) {
    return Array.from({ length: rows.affected_rows }, (_, i) => rows[i + 1]);
  } else {
    throw new Error(`上传名单的响应无法解析为数组`);
  }
};
const prepareDownload = (value, field, row) => {
  //TODO:此处的值生成逻辑应该和ModelFieldRender部分一致
  if (field.type == "array" && Array.isArray(value)) {
    return value.join(",");
  } else if (Array.isArray(field.choices) && field.choices.length) {
    const find = field.choices.find((c) => c.value === value);
    if (!find) {
      return value;
    } else {
      return find.label;
    }
  } else if (field.type == "foreignkey") {
    return row[`${field.name}__${field.reference_label_column}`] ?? value;
  } else {
    return value;
  }
};

const prepareUpload = ({ value, field, index }) => {
  if (field.type == "array" && typeof value == "string") {
    // a,b,c => ['a','b','c']
    return value.split(",").map((e) => (typeof e == "string" ? e.trim() : e));
  } else if (Array.isArray(field.choices) && field.choices.length) {
    const find = field.choices.find((c) => c.label === value);
    if (!find) {
      throw new Model.ValidateBatchError({
        name: field.name,
        message: `无效名称:${value}`,
        label: field.label,
        batch_index: index,
        value,
      });
    } else {
      return find.value;
    }
  } else {
    return value;
  }
};

const prepareForDb = (row, index) => {
  const dbRow = {};
  for (const name of batchNames.value) {
    const label = props.model.name_to_label[name];
    const value = row[label];
    if (value === undefined) {
      continue;
    }
    dbRow[name] = prepareUpload({ value, field: props.model.fields[name], index });
  }
  return dbRow;
};

const fetchFunctionChoices = async (names) => {
  for (const name of names) {
    const field = props.model.fields[name];
    if (typeof field.choices == "function") {
      field.choices = await field.choices();
    }
  }
};

const onXlsxRead = async ({ ok, message, rows }) => {
  emit("read", { ok, rows });
  if (!ok) {
    Notice.error(message);
  } else if (rows.length === 0) {
    Notice.error(`至少填写一行数据`);
  } else {
    const actualNames = Object.keys(rows[0])
      .flatMap((label) => {
        const name = props.model.label_to_name[label];
        return name ? [name] : [];
      })
      .filter((name) => batchNames.value.includes(name));
    try {
      await fetchFunctionChoices(actualNames);
      const [cleanedRows, columns] = props.model.validate_update_data(
        ensureUnique(rows.map(prepareForDb)),
        actualNames,
      );
      emit("uploadRows", cleanedRows);
      if (props.uploadUrl) {
        const response = await Http.post(props.uploadUrl, cleanedRows);
        const insertRows = ensureArray(response.data);
        emit("successUpload", { insertRows, uploadRows: cleanedRows });
        Notice.success(
          `操作成功, 增加${insertRows.length}条, 更新${cleanedRows.length - insertRows.length}条`,
        );
      }
    } catch (error) {
      if (error.name == "AxiosError") {
        const {
          response: { data, status },
        } = error;
        Notice.error(typeof data == "object" ? JSON.stringify(data) : data);
      } else if (error instanceof Model.ValidateBatchError) {
        console.log({ error });
        const rowHint = modelUniqueKey.value
          ? `(${rows[error.batch_index][props.model.name_to_label[modelUniqueKey.value]]})`
          : "";
        Notice.error(
          `第${error.batch_index + 1}行${rowHint}“${error.label}”错误（${error.value}）：${
            error.message
          }`,
        );
      } else {
        Notice.error(error.message);
      }
    }
  }
};

const downloadAllData = async () => {
  const data = (await Http[props.downloadMethod](props.downloadUrl)).data;
  let actualNames;
  if (data[0]) {
    const actualKeys = new Set(Object.keys(data[0]));
    actualNames = batchNames.value.filter((name) => actualKeys.has(name));
  } else {
    actualNames = batchNames.value;
  }
  await fetchFunctionChoices(actualNames);
  Xlsx.arrayToFile({
    filename: `${props.model.label}-${new Date().getTime()}`,
    data: [
      ["#", ...actualNames.map((k) => props.model.name_to_label[k])],
      ...data.map((row, index) => [
        index + 1,
        ...actualNames.map((k) => prepareDownload(row[k], props.model.fields[k])),
      ]),
    ],
  });
  Notice.success("下载成功，请留意浏览器下载目录");
};

const downloadRows = async () => {
  const data = props.rows || [];
  Xlsx.arrayToFile({
    filename: `${props.model.label}-${new Date().getTime()}`,
    data: [
      ["#", ...batchNames.value.map((k) => props.model.name_to_label[k])],
      ...data.map((row, index) => [
        index + 1,
        ...batchNames.value.map((k) => {
          // log({ k, batchNames: batchNames.value });
          return prepareDownload(row[k], props.model.fields[k], row);
        }),
      ]),
    ],
  });
  Notice.success("下载成功，请留意浏览器下载目录");
};
defineExpose({ downloadRows, downloadAllData });
</script>
<template>
  <xlsx-read-button
    v-if="!props.hideUpload"
    @read="onXlsxRead"
    :button-text="uploadButtonText"
    :hint="uploadButtonHint"
  ></xlsx-read-button>

  <a-tooltip
    v-if="!props.hideDownloadAll"
    :title="`下载全部记录${total}条`"
    color="blue"
    placement="bottom"
  >
    <a-button @click="downloadAllData" :disabled="loading">
      <download-outlined></download-outlined>
      下载
    </a-button>
  </a-tooltip>
  <a-tooltip
    v-if="!props.hideDownload"
    :title="`导出当前页面记录${props.rows.length}条`"
    color="blue"
    placement="bottom"
  >
    <a-button @click="downloadRows" :disabled="loading">
      <download-outlined></download-outlined>
      {{ props.downloadButtonText || "导出" }}
    </a-button>
  </a-tooltip>
</template>
