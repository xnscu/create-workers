<script setup>
import { read, utils } from "xlsx";
import { UploadOutlined } from "@ant-design/icons-vue";

const emit = defineEmits(["read"]);
const reading = ref(false);

const props = defineProps({
  multipleSheets: { type: Boolean, default: false },
  buttonText: { type: String, default: "上传" },
  hint: { type: String, default: "批量新增或更新" },
  startRow: { type: Number, default: 1 },
  type: { type: String, default: "default" },
});

const sheetToJson = (sheet) => {
  const range = sheet["!ref"];
  const [start, end] = range.split(":");
  const newRange = `A${props.startRow}:${end}`;
  // ** 这里转换的时候,有时候空白单元格不会转换为空字符串, 而是直接忽略
  return utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
    dateNF: "yyyy-mm-dd",
    range: newRange,
  });
};

const onAntdUpload = ({ file, fileList, event }) => {
  // https://antdv.com/components/upload/#FAQ
  // beforeUpload 返回false的时候file就是原始的file, 否则需要通过originFileObj获取
  var reader = new FileReader();
  reader.onload = function (event) {
    reading.value = true;
    var binary = "";
    var bytes = new Uint8Array(event.target.result);
    var length = bytes.byteLength;
    for (var i = 0; i < length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    var workbook = read(binary, { type: "binary" });
    var n = workbook.SheetNames.length;
    if (!props.multipleSheets && n !== 1) {
      emit("read", {
        ok: false,
        message: `上传的电子文档只能包含1个工作表，当前${n}个`,
      });
      reading.value = false;
      return;
    }
    if (!props.multipleSheets) {
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var rows = sheetToJson(sheet);
      emit("read", { ok: true, rows });
    } else {
      emit("read", {
        ok: true,
        sheets: workbook.SheetNames.map((name) => ({
          name,
          data: sheetToJson(workbook.Sheets[name]),
        })),
      });
    }
    reading.value = false;
  };
  reader.readAsArrayBuffer(file);
};
</script>

<template>
  <a-upload
    list-type="picture"
    @change="onAntdUpload"
    accept=".xlsx"
    :max-count="1"
    :showUploadList="false"
    :beforeUpload="() => false"
  >
    <a-tooltip :title="hint" color="blue" placement="bottom">
      <a-button :type="type" :loading="reading">
        <upload-outlined></upload-outlined>
        {{ buttonText }}
      </a-button>
    </a-tooltip>
  </a-upload>
</template>
