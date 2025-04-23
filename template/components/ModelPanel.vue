<route lang="yaml"></route>
<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PlusOutlined } from "@ant-design/icons-vue";
import ModelBatchButton from "~/components/ModelBatchButton.vue";
import { notification } from "ant-design-vue";
import { normalize_choice } from "~/lib/model/field.mjs";
// import "ant-design-vue/lib/notification/style/css";
// import "ant-design-vue/lib/modal/style/css";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const snakeToCamel = (s) => {
  return s.replace(/(_[a-zA-Z])/g, (c) => {
    return c[1].toUpperCase();
  });
};

const toPascalName = (s) => {
  return capitalize(snakeToCamel(s));
};
const emit = defineEmits(["successUpload", "getRecords"]);
const route = useRoute();
const router = useRouter();
const slots = useSlots();
const props = defineProps({
  model: { type: [Object, Function], required: true },
  searchInputWidth: { type: String, default: "350px" },
  inplace: { type: Boolean, default: false }, // 是否弹出式更新添加和详情
  singleSearch: { type: Boolean, default: true }, //不叠加搜索
  rowKey: { type: [String, Function], default: "id" },
  showPagenation: { type: Boolean, default: true },
  uploadButtonText: { type: String },
  uploadButtonHint: { type: String },
  detailButtonText: { type: [String, Function], default: "详情" },
  editButtonText: { type: String, default: "编辑" },
  addButtonText: { type: String, default: "添加" },
  deleteTitleKey: { type: [String, Function], default: "" },
  searchNames: { type: Array },
  updateFormNames: { type: Array },
  createFormNames: { type: Array },
  formNames: { type: Array },
  downloadNames: { type: Array },
  detailNames: { type: Array },
  listNames: { type: Array },
  columnNames: { type: Array },
  uniqueKey: { type: [String, Array] },
  formWidth: { type: String },
  detailWidth: { type: String },
  detailLabelCol: { type: Number, default: 4 },
  formLabelCol: { type: Number, default: 4 },
  columnLabel: { type: Object },
  hideSearch: { type: Boolean, default: false },
  hideUpload: { type: Boolean, default: false },
  hideDownload: { type: Boolean, default: true },
  hideDownloadAll: { type: Boolean, default: true },
  readonly: { type: Boolean, default: false },
  hideAdd: { type: Boolean, default: false },
  hideDelete: { type: [Boolean, Function], default: false },
  hideEdit: { type: [Boolean, Function], default: false },
  hideDetail: { type: [Boolean, Function], default: false },
  pagesize: {
    type: [Number, String],
    default: Number(import.meta.env.VITE_ADMIN_PAGESIZE || 50),
  },
  uploadUrl: { type: [String, Function], default: (props) => `/${props.model.table_name}/merge` },
  downloadUrl: {
    type: [String, Function],
    default: (props) => `/${props.model.table_name}/download`,
  },
  listUrl: { type: [String, Function], default: (props) => `/${props.model.table_name}` },
  createUrl: { type: [String, Function], default: (props) => `/${props.model.table_name}/create` },
  updateUrl: { type: Function, default: (tableName, id) => `/${tableName}/update/${id}` },
  deleteUrl: { type: Function, default: (tableName, id) => `/${tableName}/delete/${id}` },
  detailUrl: { type: Function, default: (tableName, id) => `/${tableName}/detail/${id}` },
  getCreateRoute: {
    type: Function,
    default: ({ modelName, tableName }) => ({ name: `${modelName}Create`, query: { tableName } }),
  },
  getDetailRoute: {
    type: Function,
    default: ({ modelName, tableName, record }) => ({
      name: `${modelName}Detail`,
      query: { id: record.id, tableName },
    }),
  },
  getUpdateRoute: {
    type: Function,
    default: ({ modelName, tableName, record }) => ({
      name: `${modelName}Update`,
      query: { id: record.id, tableName },
    }),
  },
  getDeleteRoute: {
    type: Function,
    default: ({ modelName, tableName, record }) => ({
      name: `${modelName}Delete`,
      query: { id: record.id, tableName },
    }),
  },
});
const alwaysArray = (v) => (typeof v == "string" && v ? [v] : Array.isArray(v) ? [...v] : []);
const getLast = (arr) => arr[arr.length - 1];
const sameNames = (a, b) => {
  a = !Array.isArray(a) ? [a] : a;
  b = !Array.isArray(b) ? [b] : b;
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
};
const jsonTypes = {
  jsonb: true,
  json: true,
};
const tableName = computed(() => props.model.table_name);
const modelName = computed(() => toPascalName(tableName.value));
const formWidth = !props.formWidth
  ? Object.values(props.model.fields).find((f) => f.type == "table")
    ? "80%"
    : "600px"
  : props.formWidth;
const detailWidth = !props.detailWidth
  ? Object.values(props.model.fields).find((f) => f.type == "table")
    ? "80%"
    : "1000px"
  : props.formWidth;
const currentPage = ref(Number(props.page || route.query.page || 1));
const pagesize = ref(Number(route.query.pagesize || props.pagesize));
const routeQueryK = computed(() => alwaysArray(route.query.k));
const routeQueryV = computed(() => alwaysArray(route.query.v));
const routeQueryBK = computed(() => alwaysArray(route.query.bk));
const routeQueryBV = computed(() => alwaysArray(route.query.bv));
const queryFilter = computed(() =>
  Object.fromEntries(
    routeQueryBK.value.map((k, i) => {
      if (k.slice(-4) == "__in") {
        return [k, routeQueryBV.value[i].split(",")];
      }
      return [k, routeQueryBV.value[i]];
    }),
  ),
);
const searchKeys = computed(() => {
  const keys =
    props.searchNames ||
    Object.entries(props.model.fields)
      .filter(
        ([name, f]) =>
          !f.primary_key &&
          !f.serial &&
          !f.auto_now &&
          !f.auto_now_add &&
          !jsonTypes[f.db_type] &&
          !f.type.startsWith("alioss") &&
          f.type !== "uuid",
      )
      .map(([name, f]) => name);
  //过滤掉routeQueryBK中已经存在的key
  return keys.filter((name) => !routeQueryBK.value.includes(name));
});
const records = ref([]);
const total = ref(0);
const isChoicesAvailable = (field) => {
  return field && !field.autocomplete && Array.isArray(field.choices) && field.choices.length > 0;
};

const containable_db_types = {
  varchar: true,
  text: true,
  timestamp: true,
  date: true,
  time: true,
};
const getFieldChoice = (field) => {
  if (isChoicesAvailable(field)) {
    return { label: field.label, value: field.name };
  } else {
    let search_key, db_type;
    if (field.type === "foreignkey" && field.reference_column !== field.reference_label_column) {
      search_key = field.name + "__" + field.reference_label_column;
      db_type = field.reference.fields[field.reference_label_column].db_type;
    } else {
      search_key = field.name;
      db_type = field.db_type;
    }
    if (containable_db_types[db_type]) {
      return { label: field.label, value: search_key + "__contains" };
    } else {
      return { label: field.label, value: search_key };
    }
  }
};
const searchableFieldChoices = computed(() => {
  return searchKeys.value.map((name) => props.model.fields[name]).map(getFieldChoice);
});
const currentKey = computed(() => {
  return getLast(routeQueryK.value.filter((k) => searchKeys.value.includes(k)));
});
const currentSearchSelectName = ref(
  currentKey.value || searchableFieldChoices.value[0]?.value || "",
);
const currentSearchField = computed(
  () => props.model.fields[currentSearchSelectName.value.split("__")[0]],
);
const currentSearchInputValue = ref(currentKey.value ? getLast(routeQueryV.value) : "" || "");
const listUrl = computed(() => {
  if (typeof props.listUrl == "function") {
    return props.listUrl(tableName.value);
  } else {
    return props.listUrl;
  }
});
const setRecordsByPage = async (page, old) => {
  const keys = routeQueryK.value.map((k) => {
    const c = searchableFieldChoices.value.find((c) => c.value === k);
    if (c) {
      return c.value;
    } else {
      return k;
    }
  });
  const values = routeQueryV.value;
  const config = {
    params: {
      page,
      pagesize: props.showPagenation ? pagesize.value : undefined,
      k: keys,
      v: values,
    },
  };
  const { data } = await Http.post(listUrl.value, queryFilter.value, config);
  records.value = data.records;
  total.value = data.total;
  emit("getRecords", data.records);
};
watch(
  () => route.query,
  async (a, b) => {
    console.log("changed..", a, b);
    if (Object.keys(a).length === 0 && b !== undefined) {
      // 为了避免重复加载根据特征这样判定,但会导致点击后退按钮异常,暂时不管
      return;
    }
    await setRecordsByPage(route.query.page);
  },
  { deep: true, immediate: true },
);
// watch(
//   currentPage,
//   async (page, old) => {
//     await setRecordsByPage(page, old);
//   },
//   { immediate: true },
// );

// watch(
//   // () => [routeQueryK.value, routeQueryV.value],
//   () => [route.query.k, route.query.v],
//   async ([k, v], [k2, v2]) => {
//     // console.log(JSON.stringify([k, v, k2, v2]));
//     if (!k?.length || !v?.length) {
//       // 从A model的搜索页面跳转到B model时, k, v皆为空
//       return;
//     }
//     // 确保查询框发起查询时都会重置页码
//     if (!sameNames(v, v2) || !sameNames(k, k2)) {
//       await setRecordsByPage(1);
//     }
//   },
//   { deep: true },
// );
const toAntdColumns = (names) => {
  return names.map((k) => {
    // const width = Math.min(
    //   50,
    //   records.value.reduce((max, row) => Math.max(max, String(row[k]).length), 0),
    // );
    return {
      title: props.columnLabel?.[k] || props.model.name_to_label[k],
      dataIndex: k,
      field: props.model.fields[k],
      // width: Math.max(3, width + 4) + "em", // table-layout为fixed才生效
      key: k,
    };
  });
};
const hideActionColumn = computed(
  () => props.hideDelete && props.hideDetail && props.hideEdit && !slots.actions,
);
const tableColumns = computed(() => [
  { title: "#", key: "#" },
  ...toAntdColumns(
    props.columnNames ||
      props.model.admin?.column_names ||
      props.listNames ||
      props.model.admin?.list_names ||
      props.model.names,
  ),
  ...(hideActionColumn.value ? [] : [{ title: "操作", key: "action" }]),
]);

const currentRecord = ref(null);
const showUpdateForm = ref(false);
const showCreateForm = ref(false);
const showDeleteForm = ref(false);
const showDetail = ref(false);
const modelUniqueKey = computed(
  () =>
    props.uniqueKey ||
    props.model.unique_together?.[0] ||
    Object.values(props.model.fields).find((f) => f.unique)?.name,
);

const findDuplicates = (rows) => {};
const showReadableValue = ({ row, name, model }) => {
  const value = row[name];
  const field = model.fields[name];
  if (field) {
    if (field.type == "foreignkey") {
      return row[`${name}__${field.reference_label_column}`] ?? value;
    } else if (Array.isArray(field.choices) && field.choices.length > 0) {
      return field.choices.find((c) => c.value == value)?.label ?? value;
    } else {
      return value;
    }
  } else {
    return value;
  }
};
const getDeleteTitle = (row) => {
  if (typeof props.deleteTitleKey == "function") {
    return props.deleteTitleKey(row);
  }
  if (Array.isArray(modelUniqueKey.value)) {
    return modelUniqueKey.value
      .map((k) => showReadableValue({ row, name: k, model: props.model }))
      .join("-");
  } else {
    const key = props.deleteTitleKey || modelUniqueKey.value;
    return (key && row[key]) || "";
  }
};
const onDeleteRecord = async (record) => {
  const { data } = await Http.post(props.deleteUrl(tableName.value, record.id));
  records.value = records.value.filter((r) => r.id !== record.id);
  notification.success({ message: `成功删除${data.affected_rows}条记录` });
  showDeleteForm.value = false;
};
const currentDeleteTitle = computed(() => {
  if (currentRecord.value) {
    return getDeleteTitle(currentRecord.value);
  } else {
    return "";
  }
});
const onSuccessCreate = (data) => {
  records.value.unshift(data);
  showCreateForm.value = false;
};
const onSuccessUpdate = (data) => {
  const record = records.value.find((e) => e.id === currentRecord.value.id);
  if (record) {
    Object.assign(record, Array.isArray(data) ? data[0] : data);
  }
  showUpdateForm.value = false;
  currentRecord.value = null;
};
const onClickEdit = async (record) => {
  const { data } = await Http.get(props.detailUrl(tableName.value, record.id));
  currentRecord.value = { ...record, ...data };
  showUpdateForm.value = true;
};
const onClickDelete = (record) => {
  showDeleteForm.value = true;
  currentRecord.value = record;
};
const onClickDetail = async (record) => {
  const { data } = await Http.get(props.detailUrl(tableName.value, record.id));
  currentRecord.value = { ...record, ...data };
  showDetail.value = true;
};
const makePageRoute = ({ page, key, value, bk, bv }) => {
  const query = {
    tableName: tableName.value,
    page,
    pagesize: pagesize.value,
    k: key ?? routeQueryK.value,
    v: value ?? routeQueryV.value,
    bk: bk ?? routeQueryBK.value,
    bv: bv ?? routeQueryBV.value,
  };
  const res = { name: route.name, query };
  return res;
};
const resetSearch = () => {
  currentSearchInputValue.value = "";
  router.push(
    makePageRoute({
      page: 1,
      key: [],
      value: [],
    }),
  );
};
const autocompleteSearchOptions = ref([]);
const enterSearchOnly = (e) => {
  if (e.keyCode === 13) {
    e.preventDefault();
    search();
  }
};
const showChoicesWhenSmall = async (field) => {
  const limit = field.max_display_count || Number(process.env.MAX_DISPLAY_COUNT || 100);
  // preload=true点击的时候需要加能显示下拉列表
  await nextTick();
  if (Array.isArray(currentSearchField.value.choices)) {
    autocompleteSearchOptions.value = currentSearchField.value.choices.slice(0, limit) || [];
  }
};
const onAutocompleteSelect = (value, option) => {
  // log("onAutocompleteSelect", value, option);
  currentSearchInputValue.value = option.label;
};
const onAutocompleteChange = (value) => {};
const onAutocompleteSearch = async (text) => {
  // log("onAutocompleteSearch", text);
  if (!text) {
    await showChoicesWhenSmall(currentSearchField.value.choices);
    return;
  }
  if (typeof currentSearchField.value.choices == "function") {
    autocompleteSearchOptions.value = (
      await currentSearchField.value.choices({ keyword: text })
    ).map(normalize_choice);
  } else {
    const matchRule = new RegExp(text.split("").join(".*"));
    autocompleteSearchOptions.value = currentSearchField.value.choices.filter((e) => {
      // 暂时只针对字符串过滤
      if (typeof e.label == "string") {
        return e.label.includes(text) || matchRule.test(e.label);
      } else {
        return true;
      }
    });
  }
};
const search = async () => {
  if (currentSearchInputValue.value === undefined || !currentSearchSelectName.value) {
    return;
  }
  const nameIndex = routeQueryK.value.findIndex((e) => e === currentSearchSelectName.value);
  if (props.singleSearch) {
    router.push(
      makePageRoute({
        page: 1,
        key: [currentSearchSelectName.value],
        value: [currentSearchInputValue.value],
      }),
    );
  } else if (nameIndex !== -1) {
    routeQueryV.value[nameIndex] = currentSearchInputValue.value;
    router.push(
      makePageRoute({
        page: 1,
        key: routeQueryK.value,
        value: routeQueryV.value,
      }),
    );
  } else {
    router.push(
      makePageRoute({
        page: 1,
        key: [...routeQueryK.value, currentSearchSelectName.value],
        value: [...routeQueryV.value, currentSearchInputValue.value],
      }),
    );
  }
  // 放到这里不会生效, watch里面才能观测到searchInputValue的变化从而发起查询
  // await setRecordsByPage(1);
};
const successPostBatch = ({ uploadRows, insertRows }) => {
  emit("successUpload", { insertRows, uploadRows });
};
const detailFields = computed(() => {
  const fields = [];
  for (const name of props.detailNames ||
    props.model.admin?.detail_names ||
    props.model.field_names) {
    const field = props.model.fields[name];
    // if (field.type == 'table') {
    //   continue
    // }
    fields.push(field);
  }
  return fields;
});
const updateNames = computed(
  () =>
    props.updateFormNames ||
    props.model.admin?.update_form_names ||
    props.formNames ||
    props.model.admin?.form_names,
);
const createNames = computed(
  () =>
    props.createFormNames ||
    props.model.admin?.create_form_names ||
    props.formNames ||
    props.model.admin?.form_names,
);
const closeDetailPanel = () => {
  showDetail.value = false;
};
const onClickAdd = () => {
  if (props.inplace) {
    showCreateForm.value = true;
  } else {
    router.push(props.getCreateRoute({ modelName: modelName.value, tableName: tableName.value }));
  }
};
const uploadUrl = computed(() => {
  if (typeof props.uploadUrl == "function") {
    return props.uploadUrl(tableName.value);
  } else {
    return props.uploadUrl;
  }
});
const downloadUrl = computed(() => {
  if (typeof props.downloadUrl == "function") {
    return props.downloadUrl(tableName.value);
  } else {
    return props.downloadUrl;
  }
});
const createUrl = computed(() => {
  if (typeof props.createUrl == "function") {
    return props.createUrl(tableName.value);
  } else {
    return props.createUrl;
  }
});
const updateUrl = computed(() => {
  return currentRecord.value ? props.updateUrl(tableName.value, currentRecord.value.id) : "";
});
const ModelBatchButtonRef = ref();
const downloadRows = () => {
  ModelBatchButtonRef.value.downloadRows();
};
defineExpose({ onClickDetail, closeDetailPanel, setRecordsByPage, downloadRows });
</script>
<template>
  <a-row type="flex" justify="space-between">
    <a-col>
      <model-batch-button
        v-if="props.model"
        ref="ModelBatchButtonRef"
        :model="props.model"
        :uploadButtonText="uploadButtonText"
        :uploadButtonHint="uploadButtonHint"
        :names="props.downloadNames || props.model.admin?.download_names || props.model.names"
        :rows="records"
        :total="total"
        :hideUpload="props.hideUpload ?? props.disabled"
        :hideDownload="props.hideDownload"
        :hideDownloadAll="props.hideDownloadAll"
        :uniqueKey="modelUniqueKey"
        :uploadUrl="uploadUrl"
        :downloadUrl="downloadUrl"
        @findDuplicates="findDuplicates"
        @successUpload="successPostBatch"
      ></model-batch-button>
      <a-button v-if="!props.hideAdd && !props.readonly" @click="onClickAdd">
        <template #icon>
          <plus-outlined></plus-outlined>
        </template>
        {{ props.addButtonText }}
      </a-button>
      <slot name="button" v-bind="{ records }"></slot>
    </a-col>
    <a-col>
      <a-row v-if="!props.hideSearch">
        <a-col v-if="routeQueryK.length">
          <a-button @click="resetSearch">重置搜索</a-button>
        </a-col>
        <a-col>
          <a-select
            v-model:value="currentSearchSelectName"
            @change="currentSearchInputValue = ''"
            placeholder="选择查找字段"
            style="width: 150px"
          >
            <a-select-option v-for="(c, i) in searchableFieldChoices" :value="c.value" :key="i">{{
              c.label
            }}</a-select-option>
          </a-select></a-col
        >
        <a-col>
          <a-select
            v-if="isChoicesAvailable(currentSearchField)"
            v-model:value="currentSearchInputValue"
            style="width: 150px"
          >
            <a-select-option
              v-for="(c, i) in currentSearchField.choices"
              :value="c.value"
              :key="i"
              >{{ c.label }}</a-select-option
            >
          </a-select>
          <a-auto-complete
            v-else-if="currentSearchField?.autocomplete"
            v-model:value="currentSearchInputValue"
            :style="{ width: searchInputWidth }"
            :options="autocompleteSearchOptions"
            @select="onAutocompleteSelect"
            @change="onAutocompleteChange"
            @keydown="enterSearchOnly"
            @search="onAutocompleteSearch"
          >
          </a-auto-complete>
          <a-input v-else v-model:value.trim="currentSearchInputValue" @keyup.enter="search" />
        </a-col>
        <a-col>
          <a-button @click="search">查找</a-button>
        </a-col>
      </a-row>
    </a-col>
  </a-row>
  <a-row>
    <a-col style="margin: auto">
      <a-pagination
        v-if="showPagenation"
        v-model:current="currentPage"
        :show-total="
          (total, range) =>
            range[1] < total ? `第${range[0]}-${range[1]}条, 共${total}条` : `共${total}条`
        "
        :total="total"
        :showSizeChanger="false"
        :page-size="pagesize"
      >
        <template #itemRender="{ type, page, originalElement }">
          <router-link v-if="type === 'page'" :to="makePageRoute({ page })">{{ page }}</router-link>
          <component :is="originalElement" v-else></component>
        </template>
      </a-pagination>
    </a-col>
  </a-row>
  <a-table
    :rowKey="props.rowKey"
    :dataSource="records"
    table-layout="auto"
    :columns="tableColumns"
    :pagination="{ hideOnSinglePage: true, pageSize: pagesize }"
  >
    <template #bodyCell="{ column, index, record, text, value }">
      <template v-if="column?.key === '#'">{{ index + 1 }}</template>
      <template v-else-if="column?.key === 'action'">
        <a-button
          v-if="
            props.inplace &&
            (typeof props.hideDetail == 'function' ? !props.hideDetail(record) : !props.hideDetail)
          "
          type="link"
          size="small"
          @click.prevent="onClickDetail(record)"
        >
          {{
            typeof props.detailButtonText == "function"
              ? props.detailButtonText(record)
              : props.detailButtonText
          }}
        </a-button>
        <a-button
          v-if="
            !props.inplace &&
            (typeof props.hideDetail == 'function' ? !props.hideDetail(record) : !props.hideDetail)
          "
          type="link"
          size="small"
        >
          <RouterLink :to="props.getDetailRoute({ modelName, tableName, record })">
            {{
              typeof props.detailButtonText == "function"
                ? props.detailButtonText(record)
                : props.detailButtonText
            }}</RouterLink
          >
        </a-button>
        <a-button
          v-if="
            props.inplace &&
            !props.readonly &&
            (typeof props.hideEdit == 'function' ? !props.hideEdit(record) : !props.hideEdit)
          "
          type="link"
          size="small"
          @click.prevent="onClickEdit(record)"
        >
          {{ props.editButtonText }}
        </a-button>
        <a-button
          v-if="
            !props.inplace &&
            !props.readonly &&
            (typeof props.hideEdit == 'function' ? !props.hideEdit(record) : !props.hideEdit)
          "
          type="link"
          size="small"
        >
          <RouterLink :to="props.getUpdateRoute({ modelName, tableName, record })">{{
            props.editButtonText
          }}</RouterLink>
        </a-button>
        <a-button
          v-if="
            !props.readonly &&
            (typeof props.hideDelete == 'function' ? !props.hideDelete(record) : !props.hideDelete)
          "
          type="link"
          size="small"
          style="color: red"
          @click.prevent="onClickDelete(record)"
          >删除</a-button
        >
        <span>
          <slot name="actions" v-bind="{ column, index, record, text, value, records }"></slot>
        </span>
      </template>
      <template v-else-if="column?.field">
        <slot
          v-if="slots[`column-${column.field.name}`]"
          :name="`column-${column.field.name}`"
          v-bind="{ value: record[column.field.name], field: column.field, record, index, records }"
        >
          <model-field-render :field="column.field" :record="record"></model-field-render>
        </slot>
        <model-field-render v-else :field="column.field" :record="record"></model-field-render>
      </template>
      <template v-else>
        {{ value }}
      </template>
    </template>
  </a-table>
  <a-row v-if="total > pagesize">
    <a-col style="margin: auto">
      <a-pagination
        v-if="showPagenation"
        v-model:current="currentPage"
        :total="total"
        :page-size="pagesize"
        :showSizeChanger="false"
      >
        <template #itemRender="{ type, page, originalElement }">
          <router-link v-if="type === 'page'" :to="makePageRoute({ page })">{{ page }}</router-link>
          <component :is="originalElement" v-else></component>
        </template>
      </a-pagination>
    </a-col>
  </a-row>
  <a-modal
    v-model:visible="showCreateForm"
    title="创建"
    @cancel="showCreateForm = false"
    :maskClosable="false"
    closable
    :width="formWidth"
  >
    <template #footer> </template>
    <model-form
      v-if="showCreateForm"
      :labelCol="props.formLabelCol"
      :names="createNames"
      @successPost="onSuccessCreate"
      :model="props.model"
      :values="props.model.get_defaults()"
      :action-url="createUrl"
    ></model-form>
  </a-modal>
  <a-modal
    v-model:visible="showUpdateForm"
    :title="editButtonText"
    @cancel="
      currentRecord = null;
      showUpdateForm = false;
    "
    :maskClosable="false"
    closable
    :width="formWidth"
  >
    <template #footer> </template>
    <model-form
      v-if="showUpdateForm"
      :labelCol="props.formLabelCol"
      :names="updateNames"
      @successPost="onSuccessUpdate"
      :model="props.model"
      :values="currentRecord"
      :action-url="updateUrl"
    ></model-form>
  </a-modal>
  <a-modal
    v-model:visible="showDetail"
    :title="
      typeof props.detailButtonText == 'function'
        ? props.detailButtonText(currentRecord)
        : props.detailButtonText
    "
    @cancel="
      showDetail = false;
      currentRecord = null;
    "
    :maskClosable="true"
    closable
    :width="detailWidth"
  >
    <slot
      v-if="currentRecord"
      name="detail"
      v-bind="{
        records,
        detail: currentRecord,
        closeModal: () => (showDetail = false),
      }"
    >
      <model-detail
        :model="model"
        :record="currentRecord"
        :detail-names="detailNames"
      ></model-detail>
    </slot>
    <slot
      v-if="currentRecord"
      name="additionDetail"
      v-bind="{
        records,
        detail: currentRecord,
        closeModal: () => (showDetail = false),
      }"
    >
    </slot>
    <template #footer> </template>
  </a-modal>
  <a-modal
    v-model:visible="showDeleteForm"
    title="确认删除这条记录吗?"
    @ok="onDeleteRecord(currentRecord)"
    @cancel="currentRecord = null"
    :maskClosable="false"
    ok-type="danger"
    ok-text="删除"
    closable
    :width="formWidth"
  >
    <h3 class="center">{{ currentDeleteTitle }}</h3>
  </a-modal>
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
