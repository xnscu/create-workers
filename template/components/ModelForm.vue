<script setup>
import { PlusOutlined, CloseOutlined } from '@ant-design/icons-vue'
import useStore from '~/composables/useStore'
import { usePost } from '~/globals'

const deepcopy = (o) => JSON.parse(JSON.stringify(o))
const slots = useSlots()

const props = defineProps({
  model: { type: [Object, Function], required: true },
  names: { type: Array },
  values: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) },
  syncValues: { type: Boolean, default: false },
  valuesHook: { type: Function, default: (data) => data },
  tableFieldDownloadUrl: { type: [Object, String, Function] },
  tableFieldUniqueKey: { type: [Object, String, Function] },
  actionUrl: { type: String, required: false },
  method: { type: String, default: 'POST' },
  successMessage: { type: String, default: '' },
  hideSubmitButton: { type: Boolean, default: false },
  scrollToFirstError: { type: Boolean, default: true },
  submitButtonText: { type: String },
  itemWidth: { type: String },
  layout: { type: String, default: 'horizontal' }, // horizontal
  trigger: { type: String, default: 'blur' },
  labelCol: { type: Number, default: 3 },
  labelColon: { type: Boolean, default: false },
})

const genRandomString = () => Math.random().toString(36).substr(2, 9)
const emit = defineEmits(['submit', 'successPost', 'sendData'])
const { loading } = useStore()
const arrayKeyDict = {}
const formNames = computed(() => props.names || props.model.admin?.form_names || props.model.names)
const values = props.syncValues ? reactive(props.values) : reactive(deepcopy(props.values))
const errors = reactive(props.errors)
const fieldsArray = computed(() =>
  formNames.value.map((name) => props.model.fields[name]).filter((e) => e),
)
Object.assign(values, props.model.to_form_value(values, formNames.value))
const getArrayKeyNumber = (field) => {
  const v = values[field.name]
  const n = Array.isArray(v) ? v.length || 1 : field.min || 1
  return n
}
const initErrors = () => {
  fieldsArray.value.forEach((field) => {
    if (field.type === 'array' && field.field) {
      errors[field.name] = [...Array(getArrayKeyNumber(field)).keys()].map(() => undefined)
    } else {
      errors[field.name] = undefined
    }
  })
}
initErrors()
fieldsArray.value.forEach((field) => {
  if (field.type === 'array') {
    arrayKeyDict[field.name] = [...Array(getArrayKeyNumber(field)).keys()].map(() =>
      genRandomString(),
    )
  }
})
const formRef = ref()
const formItemLayout = computed(() => {
  return props.layout === 'horizontal'
    ? {
        labelCol: { span: props.labelCol },
        wrapperCol: { span: 24 - props.labelCol },
      }
    : {}
})
const buttonItemLayout = computed(() => {
  return props.layout === 'horizontal'
    ? {
        wrapperCol: { span: 24 - props.labelCol, offset: props.labelCol },
      }
    : {}
})
const formError = ref()
const submiting = ref(false)
const clearBackendErrors = () => {
  formError.value = undefined
  initErrors()
}
const validateForm = (values) => {
  let passed = true
  for (const name of formNames.value) {
    const field = props.model.fields[name]
    try {
      values[name] = field.validate(values[name])
    } catch (error) {
      if (field.type !== 'array' || error.index === undefined) {
        errors[name] = error.message
      } else {
        errors[name][error.index] = error.message
      }
      passed = false
    }
  }
  return passed
}
const isFieldError = (data) => {
  return (
    typeof data == 'object' &&
    data.name &&
    data.message &&
    data.type == 'field_error' &&
    formNames.value.includes(data.name)
  )
}
const onFinish = async (formValues) => {
  // 表单按enter的时候，此处的formValues不会包含array和table的值(如果行数是0)
  // 它是看form-item组件有没有rules登记, 登记了且触发过才会在formValues出现
  // console.log("onFinish", { values, formValues });
  clearBackendErrors()
  if (!validateForm(formValues)) {
    return
  }
  let data
  try {
    data = props.model.to_post_value(formValues, formNames.value)
    // because of ModelFormWidget.sendValueAutocomplete, values must be included
    emit('submit', { ...values, ...data })
    emit('sendData', { ...values, ...data })
  } catch (error) {
    if (isFieldError(error)) {
      // 确认是to_post_value抛出的错误
      errors[error.name] = error.message
    } else {
      formError.value = error.message
    }
    return
  }
  if (!props.actionUrl) {
    return
  }
  try {
    submiting.value = true
    const responseData = await usePost(
      props.actionUrl,
      props.valuesHook({ ...values, ...data }), // 有时希望初始值包含一些额外的字段但是又不希望这些字段出现在表单
    )
    emit('successPost', responseData)
    Notice.success(props.successMessage || '提交成功')
  } catch (error) {
    //TODO: 返回table或array field的错误
    if (error.name == 'AxiosError') {
      const { data, status } = error.response
      if (isFieldError(data)) {
        errors[data.name] = data.message
      } else {
        formError.value = typeof data == 'object' ? JSON.stringify(data) : data
      }
    } else {
      formError.value = error.message
    }
  } finally {
    submiting.value = false
  }
}

const onFinishFailed = ({ values, errorFields, outOfDate }) => {
  //当formitem的required设置为true时,在onFinish调用前会使用表单内置的校验机制去检测
  //必填情况.但不会使errors的值发生变化, 触发出的错误也不会标红显示.为解决这个问题必须这里手动设置errors
  errorFields.forEach((f) => {
    if (f.name.length === 1) {
      errors[f.name[0]] = f.errors[0]
    }
  })
}
// const ruleTypes = {
//   float: "float",
//   integer: "integer",
//   boolean: "boolean",
//   email: "email",
//   date: "date",
// };
const getAntdRule = (field) => {
  const rule = {
    whitespace: true,
    trigger: props.trigger,
    required: field.required,
  }
  // validator定义了时, type会被忽略
  // const type = ruleTypes[field.type];
  // if (type) {
  //   rule.type = type;
  // }
  rule.validator = async (_rule, value) => {
    try {
      const validated = field.validate(value)
      return Promise.resolve(validated)
    } catch (error) {
      return Promise.reject(error)
    }
  }
  // rule.validator = (_rule, value) => {
  //   field.validate(value);
  // };
  return rule
}
const getTableFieldDownloadUrl = (field) => {
  const type = typeof props.tableFieldDownloadUrl
  if (type == 'object') {
    return props.tableFieldDownloadUrl[field.name]
  } else if (type == 'string') {
    return props.tableFieldDownloadUrl
  } else if (type == 'function') {
    return props.tableFieldDownloadUrl(values)
  } else {
    return ''
  }
}
const getTableFieldUniqueKey = (field) => {
  const type = typeof props.tableFieldUniqueKey
  if (type == 'object') {
    return props.tableFieldUniqueKey[field.name]
  } else if (type == 'string') {
    return props.tableFieldUniqueKey
  } else if (type == 'function') {
    return props.tableFieldUniqueKey(values)
  } else {
    return ''
  }
}

const addArrayField = (field) => {
  values[field.name].push(field.field.get_default())
  arrayKeyDict[field.name].push(genRandomString())
}
const deleteArrayField = (field, arrIndex) => {
  values[field.name].splice(arrIndex, 1)
  arrayKeyDict[field.name].splice(arrIndex, 1)
}

const updateValues = (data) => {
  //TODO: cascader级联选择位于array_field的情形的updateValues
  Object.assign(values, data)
}
const getItemProps = (field) => {
  const props = {}
  if (!slots[`label-${field.name}`]) {
    props.label = field.label
  }
  if (!slots[`extra-${field.name}`]) {
    props.extra = field.hint
  }
  return props
}
const getArrayItemProps = (field, arrIndex) => {
  const props = arrIndex === 0 ? {} : { ...buttonItemLayout.value }
  if (!slots[`label-${field.name}`]) {
    props.label = arrIndex === 0 ? field.label : ''
  }
  if (!slots[`extra-${field.name}`]) {
    props.extra = field.field.hint ?? field.hint
  }
  return props
}
</script>

<template>
  <a-form
    v-if="props.model"
    ref="formRef"
    v-bind="formItemLayout"
    :layout="props.layout"
    :scrollToFirstError="props.scrollToFirstError"
    :model="values"
    @finish="onFinish"
    @finish-failed="onFinishFailed"
  >
    <template v-for="field in fieldsArray" :key="field.name">
      <template v-if="field.type === 'array' && field.field">
        <a-form-item
          v-for="(value, arrIndex) in values[field.name]"
          :key="arrayKeyDict[field.name][arrIndex]"
          :colon="labelColon"
          :required="field.required"
          :name="[field.name, arrIndex]"
          :validate-status="errors[field.name][arrIndex] ? 'error' : 'success'"
          :help="errors[field.name][arrIndex]"
          :has-feedback="!!errors[field.name][arrIndex]"
          style="margin-bottom: 8px"
          v-bind="getArrayItemProps(field, arrIndex)"
        >
          <template v-if="slots[`extra-${field.name}`]" #extra>
            <slot :name="`extra-${field.name}`">
              {{ field.field.hint ?? field.hint }}
            </slot>
          </template>
          <template v-if="slots[`label-${field.name}`] && arrIndex === 0" #label>
            <slot :name="`label-${field.name}`">
              {{ arrIndex === 0 ? field.label : '' }}
            </slot>
          </template>
          <slot :name="`above-${field.name}`"></slot>
          <a-row>
            <a-col flex="auto">
              <model-form-widget
                style="width: 80%; margin-right: 8px"
                v-model:error="errors[field.name][arrIndex]"
                v-model="values[field.name][arrIndex]"
                @update:values="updateValues"
                :field="field.field"
                :name="[arrIndex]"
              ></model-form-widget>
            </a-col>
            <a-col flex="none">
              <CloseOutlined
                class="dynamic-delete-button"
                style="font-size: 100%"
                title="删除此行"
                :disabled="values[field.name].length === 1"
                @click="deleteArrayField(field, arrIndex)"
              />
            </a-col>
          </a-row>
          <slot :name="`below-${field.name}`"></slot>
        </a-form-item>

        <a-form-item
          v-bind="values[field.name].length === 0 ? { label: field.label } : buttonItemLayout"
        >
          <a-button type="dashed" style="width: 80%" @click="addArrayField(field)">
            <PlusOutlined />
            添加
          </a-button>
        </a-form-item>
      </template>
      <template v-else-if="field.type === 'table'">
        <a-form-item
          :name="field.name"
          :required="field.required"
          :colon="labelColon"
          v-bind="getItemProps(field)"
        >
          <template v-if="slots[`extra-${field.name}`]" #extra>
            <slot :name="`extra-${field.name}`">
              {{ field.hint }}
            </slot>
          </template>
          <template v-if="slots[`label-${field.name}`]" #label>
            <slot :name="`label-${field.name}`">
              {{ field.label }}
            </slot>
          </template>
          <slot :name="`above-${field.name}`"></slot>

          <model-form-table-field
            :hideDownload="field.attrs.hideDownload"
            :hideUpload="field.attrs.hideUpload"
            :model="field.model"
            :modelValue="values[field.name]"
            :names="field.names"
            :form_names="field.form_names"
            :columns="field.columns"
            @update:modelValue="
              (rows) => {
                values[field.name] = rows
                errors[field.name] = ''
              }
            "
            @read="
              ({ ok, rows }) => {
                if (ok) errors[field.name] = ''
              }
            "
            @deleteRow="
              (index) => {
                values[field.name].splice(index, 1)
              }
            "
            :downloadUrl="getTableFieldDownloadUrl(field)"
            :uniqueKey="getTableFieldUniqueKey(field)"
          ></model-form-table-field>
          <template v-if="errors[field.name]">
            <a-alert
              :message="errors[field.name]"
              type="error"
              show-icon
              style="white-space: pre"
            />
          </template>
          <slot :name="`below-${field.name}`"></slot>
        </a-form-item>
      </template>
      <template v-else>
        <a-form-item
          :name="field.name"
          :colon="labelColon"
          :required="field.required"
          :validate-status="!!errors[field.name] ? 'error' : 'success'"
          :help="errors[field.name]"
          :has-feedback="!!errors[field.name]"
          :style="props.layout === 'inline' ? { 'min-width': '20%' } : {}"
          v-bind="getItemProps(field)"
        >
          <template v-if="slots[`extra-${field.name}`]" #extra>
            <slot :name="`extra-${field.name}`">
              {{ field.hint }}
            </slot>
          </template>
          <template v-if="slots[`label-${field.name}`]" #label>
            <slot :name="`label-${field.name}`">
              {{ field.label }}
            </slot>
          </template>
          <slot :name="`above-${field.name}`"> </slot>
          <model-form-widget
            v-model:error="errors[field.name]"
            v-model="values[field.name]"
            @update:values="updateValues"
            :values="values"
            :field="field"
            :name="field.name"
          ></model-form-widget>
          <slot :name="`below-${field.name}`"></slot>
        </a-form-item>
      </template>
    </template>
    <template v-if="formError">
      <a-alert message="发生错误" :description="formError" type="error" show-icon />
    </template>
    <template v-if="!props.hideSubmitButton">
      <a-form-item v-bind="buttonItemLayout">
        <a-button :disabled="submiting" type="primary" html-type="submit" :loading="loading">
          {{ props.submitButtonText || '提交' }}
        </a-button>
      </a-form-item>
    </template>
  </a-form>
</template>

<style scoped>
.dynamic-delete-button {
  cursor: pointer;
  position: relative;
  top: 4px;
  font-size: 24px;
  color: #999;
  transition: all 0.3s;
}

.dynamic-delete-button:hover {
  color: red;
}

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
