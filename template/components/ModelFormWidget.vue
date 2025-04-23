<script setup lang="js">
import { PlusOutlined, UploadOutlined } from "@ant-design/icons-vue";
import dayjs from "dayjs";
import { chunk } from "~/lib/utils";
import Alioss from "~/lib/Alioss";
import TinymceEditorVue from "./TinymceEditor.vue";
import { normalize_choice } from "~/lib/model/field.mjs";

const emit = defineEmits(["update:modelValue", "update:error", "update:values"]);
const props = defineProps({
  field: { type: Object, required: true },
  name: { type: [String, Array] },
  values: { type: Object },
  modelValue: { required: true },
  error: { type: [String, Array], default: "" },
  borderColor: { type: String, default: "#ccc" },
});
const searchOptions = ref([]);
const fieldType = computed(() => props.field.type);
const sendValue = (value) => {
  emit("update:modelValue", value);
  // log("sendValue:", value, props.values);
};
const sendError = (value) => {
  emit("update:error", value);
};
const disableEnterKeyDown = (e) => e.keyCode === 13 && e.preventDefault();
const blurValidate = () => {
  sendError(); // 先清除老错误
  try {
    const validated = props.field.validate(props.modelValue);
    return sendValue(validated); // 为了blur的时候compact=true能看到效果(去除中间空格)
  } catch (error) {
    return sendError(error.message);
  }
};
const placeholder = computed(() => props.field.attrs?.placeholder || props.field.hint);
const pickerCurrentChoice = computed(() => {
  const lastGroup = props.field.group[props.field.group.length - 1];
  const key = lastGroup.value_key;
  return props.field.choices.find((c) => c[key] === props.modelValue);
});
const pickerInitValue = computed(() => {
  if (props.modelValue == null) {
    return [];
  } else if (props.field.group) {
    return props.field.group.map((opts) => pickerCurrentChoice.value?.[opts.label_key]);
  } else {
    return props.modelValue;
  }
});
const onCascaderChange = (e) => {
  if (props.field.group) {
    for (const [i, opts] of props.field.group.entries()) {
      emit("update:values", { [opts.form_key || opts.value_key]: e.value[i] });
    }
  } else {
    sendValue(e.value);
  }
  sendError();
};
const fieldChoices = computed(() => {
  if (typeof props.field.choices == "function") {
    return searchOptions.value;
  }
  if (!Array.isArray(props.field.choices)) {
    return null;
  }
  const group = props.field.group;
  if (group) {
    const choices = [];
    for (const c of props.field.choices) {
      let currentLevel = choices;
      for (const [i, opts] of group.entries()) {
        let l = currentLevel.find((e) => e.value == c[opts.value_key]);
        if (!l) {
          l = { value: c[opts.value_key], label: c[opts.label_key] };
          if (i < group.length - 1) {
            l.children = [];
          }
          currentLevel.push(l);
        }
        currentLevel = l.children;
      }
    }
    return choices;
  } else if (fieldType.value === "array" && props.field.field) {
    return props.field.field.choices.map((e) => ({
      ...e,
    }));
  } else {
    return props.field.choices.map((e) => ({
      ...e,
    }));
  }
});
const fieldColumns = computed(()=>props.field.attrs.columns || 1)
const chunkFieldChoices = computed(() => chunk(fieldChoices.value, fieldColumns.value));
const fieldChoicesValues = computed(() => fieldChoices.value.map((e) => e.value));
// checkbox-group里面使用checkbox的时候,值的顺序是按照点击事件先后排序,故需要特别处理
const sendSortedArray = (array) => {
  emit(
    "update:modelValue",
    array.sort((a, b) => {
      return fieldChoicesValues.value.indexOf(a) - fieldChoicesValues.value.indexOf(b);
    }),
  );
};
const currentChoiceLabel = computed(() => {
  if (props.field.group) {
    const c = pickerCurrentChoice.value;
    return c ? props.field.group.map((opts) => `${c[opts.label_key]}`).join("") : "";
  } else {
    const label =
      searchOptions.value.find((c) => c.value === props.modelValue)?.label ?? props.modelValue;
    return label;
  }
});
const autocompleteValue = ref();
const initLabel = computed(
  () => props.values?.[`${props.field.name}__${props.field.reference_label_column}`],
);
const propValue = computed(() => props.modelValue);
if (initLabel.value !== null && initLabel.value !== undefined) {
  autocompleteValue.value = initLabel.value;
} else if (props.modelValue !== null && props.modelValue !== undefined) {
  if (fieldChoices.value?.length) {
    const find = fieldChoices.value.find((c) => c.value === props.modelValue);
    if (find) {
      autocompleteValue.value = find.label;
    } else {
      autocompleteValue.value = propValue.value;
    }
  } else {
    autocompleteValue.value = propValue.value;
  }
} else {
  autocompleteValue.value = "";
}
const autocompleteEntered = ref(false);
const sendValueAutocomplete = (value) => {
  const find = fieldChoices.value.find((c) => c.value === value);
  // log("sendValueAutocomplete", value, find);
  if (find) {
    autocompleteValue.value = find.label;
    sendValue(find.value);
    // show readable value in the table in case of autocomplete field in TableField
    const labelKey = `${props.field.name}__${props.field.reference_label_column}`
    emit("update:values", { [labelKey]: find.label });
    sendError();
  } else {
    autocompleteValue.value = value;
    sendValue(value); // 为了rule校验能获取到错误的值
  }
};
const onAutocompleteSelect = (event) => {
  // log("onAutocompleteSelect", event);
};
const onAutocompleteChange = (value) => {
  //为了在preload=false的情形下, updateForm时focus然后又blur不进行检测
  autocompleteEntered.value = true;
};
const tag = computed(() => props.field.tag);
const showChoicesWhenSmall = async (field) => {
  const limit = field.max_display_count || Number(process.env.MAX_DISPLAY_COUNT || 100);
  // preload=true点击的时候需要加能显示下拉列表
  await nextTick();
  searchOptions.value = fieldChoices.value.slice(0, limit);
};
const onAutocompleteBlur = (event) => {
  const value = event.target.value;
  if (!autocompleteEntered.value) {
    //为了在preload=false的情形下, updateForm时focus然后又blur不进行检测
  } else if (value) {
    const find = fieldChoices.value.find((c) => c.label === value);
    if (!find) {
      sendError(`输入错误, 请点击下拉列表输入`);
    } else {
      sendValue(find.value); // 用户有可能手动输入了完整的label,没有点击下拉列表,所以这里要更新modelValue
      sendError();
    }
  } else if (props.field.required) {
    sendError(`请选择${props.field.label}`);
  } else {
    sendError();
  }
};
const onAutocompleteSearch = async (text) => {
  // log("onAutocompleteSearch", text);
  if (!text) {
    await showChoicesWhenSmall(props.field);
    return;
  }
  if (typeof props.field.choices == "function") {
    searchOptions.value = (await props.field.choices({ keyword: text })).map(normalize_choice);
  } else {
    const matchRule = new RegExp(text.split("").join(".*"));
    searchOptions.value = fieldChoices.value.filter((e) => {
      // 暂时只针对字符串过滤
      if (typeof e.label == "string") {
        return e.label.includes(text) || matchRule.test(e.label);
      } else {
        return true;
      }
    });
  }
};
const onAutocompleteFocus = async () => {
  if (!currentChoiceLabel.value) {
    await showChoicesWhenSmall(props.field);
  }
};
const onDatetimeChange = (date, datetime) => {
  sendValue(datetime);
};
const datetimeLocaleValue = computed(() =>
  // 如果不使用dayjs,则time部分始终是00:00:00
  props.modelValue ? dayjs(props.modelValue, "YYYY-MM-DD HH:mm") : "",
);
const wxLocationAddress = computed(() => {
  const location = props.modelValue;
  const address = location ? `${location.name}（${location.address}）` : "";
  return address;
});
const aliossCommonProps = computed(() => {
  const commonProps = {
    fileList: props.modelValue,
    "onUpdate:fileList": (value) => {
      if (!props.error) {
        sendValue(value);
      }
    },
    beforeUpload: (file) => {
      sendError();
      if (file.size > props.field.size) {
        sendError(`不能超过${props.field.size_arg}`);
        return false;
      }
    },
    data: Alioss.makeAntdDataCallback(props.field),
    action: props.field.upload_url || process.env.ALIOSS_URL,
    multiple: props.field.attrs.multiple ?? false,
    maxCount: props.field.limit,
  };
  if (fieldType.value == "alioss_image" || fieldType.value == "alioss") {
    commonProps.maxCount = 1;
  }
  return commonProps;
});
</script>
<template>
  <div>
    <a-radio-group
      v-if="fieldType == 'boolean'"
      @update:value="sendValue"
      :value="modelValue"
      :disabled="field.disabled"
    >
      <a-radio-button v-for="c in field.choices" :key="c.value" :value="c.value">
        {{ c.label }}
      </a-radio-button>
    </a-radio-group>
    <template v-else-if="fieldChoices">
      <a-cascader
        v-if="field.group"
        :value="currentChoiceLabel"
        :options="fieldChoices"
        @change="onCascaderChange"
        placeholder="请选择"
      >
      </a-cascader>
      <a-auto-complete
        v-else-if="field.autocomplete"
        @blur="onAutocompleteBlur"
        @focus="onAutocompleteFocus"
        @update:value="sendValueAutocomplete"
        @search="onAutocompleteSearch"
        @select="onAutocompleteSelect"
        @change="onAutocompleteChange"
        @keydown="disableEnterKeyDown"
        :value="autocompleteValue"
        :options="searchOptions"
        :disabled="field.disabled"
      >
        <template #option="{ label, hint }">
          <div style="display: flex; justify-content: space-between">
            {{ label }}
            <span>{{ hint }}</span>
          </div>
        </template>
      </a-auto-complete>
      <a-radio-group
        v-else-if="tag == 'radio'"
        @update:value="sendValue"
        :value="modelValue"
        :disabled="field.disabled"
      >
        <template v-for="c in field.choices" :key="c.value">
          <a-radio-button :value="c.value" :style="{ display: field.attrs.display }">{{
            c.label
          }}</a-radio-button>
        </template>
      </a-radio-group>
      <!-- <a-checkbox-group
        v-else-if="fieldType == 'array'"
        @update:value="sendValue"
        :value="modelValue"
        :disabled="field.disabled"
        :options="fieldChoices"
      >
      </a-checkbox-group> -->
      <a-checkbox-group
        v-else-if="fieldType == 'array'"
        @update:value="sendSortedArray"
        :value="modelValue"
      >
        <table>
          <tr v-for="(choices, i) in chunkFieldChoices" :key="i">
            <td v-for="opts in choices" :key="opts.value">
              <a-checkbox :value="opts.value">{{ opts.label }}</a-checkbox>
            </td>
          </tr>
        </table>
      </a-checkbox-group>
      <a-select v-else @update:value="sendValue" :value="modelValue" :disabled="field.disabled">
        <template v-for="c in field.choices" :key="c.value">
          <a-select-option :value="c.value">{{ c.label }}</a-select-option>
        </template>
      </a-select>
    </template>
    <a-slider
      v-else-if="tag == 'slider'"
      @update:value="sendValue"
      @blur="blurValidate"
      :value="modelValue"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      :tooltip-visible="field.attrs.tooltipVisible"
      :disabled="field.disabled"
    ></a-slider>
    <template v-else-if="fieldType.startsWith('alioss')">
      <a-upload
        v-if="fieldType === 'alioss_image' || fieldType === 'alioss_image_list'"
        v-bind="aliossCommonProps"
        :disabled="field.disabled"
        :list-type="field.attrs.listType || 'picture-card'"
      >
        <div>
          <PlusOutlined />
          <div>{{ field.attrs.button_text || "上传图片" }}</div>
        </div>
      </a-upload>
      <a-upload v-else v-bind="aliossCommonProps" :disabled="field.disabled">
        <a-button>
          <UploadOutlined />
          {{ field.attrs.button_text || "上传文件" }}
        </a-button>
      </a-upload>
    </template>
    <a-date-picker
      v-else-if="fieldType == 'date'"
      @update:value="sendValue"
      :value="modelValue"
      :disabled="field.disabled"
      :value-format="field.attrs?.valueFormat || 'YYYY-MM-DD'"
    ></a-date-picker>
    <a-date-picker
      v-else-if="fieldType == 'year_month'"
      @update:value="sendValue"
      :value="modelValue"
      :disabled="field.disabled"
      format="YYYY.MM"
      value-format="YYYY.MM"
      picker="month"
    ></a-date-picker>
    <a-date-picker
      v-else-if="fieldType == 'year'"
      @update:value="sendValue"
      :value="String(modelValue || '')"
      :disabled="field.disabled"
      :allow-clear="false"
      :format="'YYYY'"
      :value-format="'YYYY'"
      picker="year"
    ></a-date-picker>
    <a-date-picker
      v-else-if="fieldType == 'datetime'"
      @update:value="sendValue"
      @change="onDatetimeChange"
      :value="datetimeLocaleValue"
      :disabled="field.disabled"
      :show-time="{ format: field.attrs.timeFormat || 'HH:mm' }"
      :value-format="field.attrs.valueFormat || 'YYYY-MM-DD'"
    ></a-date-picker>
    <a-input-password
      v-else-if="fieldType == 'password'"
      @keydown="disableEnterKeyDown"
      @update:value="sendValue"
      @blur="blurValidate"
      :value="modelValue"
      :disabled="field.disabled"
    ></a-input-password>
    <a-input-number
      v-else-if="fieldType === 'float' || fieldType === 'integer'"
      @keydown="disableEnterKeyDown"
      @update:value="sendValue"
      @blur="blurValidate"
      :value="modelValue"
      :disabled="field.disabled"
    ></a-input-number>
    <a-input v-else-if="field.attrs.wx_lbs" :value="wxLocationAddress" :disabled="true"></a-input>
    <template v-else-if="fieldType == 'text' || field.input_type == 'textarea'">
      <TinymceEditorVue
        v-if="field.attrs.rich"
        @update:modelValue="sendValue"
        :modelValue="modelValue"
        :size="field.attrs.size"
        :height="field.attrs.height"
      />
      <a-textarea
        v-else
        @update:value="sendValue"
        @blur="blurValidate"
        :value="modelValue"
        :disabled="field.disabled"
        :auto-size="field.attrs.auto_size"
        :rows="field.attrs.rows || 5"
      ></a-textarea>
    </template>
    <a-input
      v-else
      @update:value="sendValue"
      @blur="blurValidate"
      :value="modelValue"
      :disabled="field.disabled"
      @keydown="disableEnterKeyDown"
    ></a-input>
  </div>
</template>

<style scoped>
:deep(.ant-input[disabled]) {
  color: rgba(0, 0, 0, 0.7);
  background-color: #f9f9f9;
}

:deep(.ant-select-disabled) {
  color: rgba(0, 0, 0, 0.7);
}

:deep(.ant-select-disabled.ant-select:not(.ant-select-customize-input) .ant-select-selector) {
  color: rgba(0, 0, 0, 0.7);
}

:deep(.ant-select-disabled .ant-select-selection) {
  background: #f9f9f9;
  cursor: not-allowed;
}
</style>
