<script setup>
import "@xnscu/tinymce/loadall";
import Editor from "@tinymce/tinymce-vue";

const props = defineProps({
  size: {
    type: [String, Number],
    required: false,
    default: process.env.ALIOSS_SIZE,
  },
  height: { type: [String, Number], required: false, default: 800 },
  modelValue: { type: String, required: true },
});
const emit = defineEmits(["update:modelValue"]);
const toolbar = `redo
undo
cut
copy
paste
pastetext
fontfamily
fontsizeinput
forecolor
backcolor
bold
italic
underline
strikethrough
aligncenter
alignjustify
alignleft
alignright
indent
lineheight
outdent
blocks
blockquote
h1
h2
h3
h4
h5
h6
hr
selectall
removeformat
`
  .split("\n")
  .join(" ");
const editorOptions = {
  language: "zh-Hans",
  license_key: "gpl",
  content_css: "default",
  // language: 'zh_CN',
  // https://www.tiny.cloud/docs/tinymce/6/menus-configuration-options/
  menubar: "edit insert format table help",
  menu: {
    // file: { title: 'File', items: 'newdocument restoredraft | preview | export print | deleteallconversations' },
    edit: {
      title: "Edit",
      items: "undo redo | cut copy paste pastetext | selectall | searchreplace",
    },
    // view: { title: 'View', items: 'code | visualaid visualchars visualblocks | spellchecker | preview fullscreen | showcomments' },
    insert: {
      title: "Insert",
      items:
        "image link media addcomment pageembed template codesample inserttable | charmap emoticons hr | pagebreak nonbreaking anchor tableofcontents | insertdatetime",
    },
    format: {
      title: "Format",
      items:
        "bold italic underline strikethrough superscript subscript codeformat | styles blocks fontfamily fontsize align lineheight | forecolor backcolor | language | removeformat",
    },
    // tools: { title: 'Tools', items: 'spellchecker spellcheckerlanguage | a11ycheck code wordcount' },
    table: {
      title: "Table",
      items: "inserttable | cell row column | advtablesort | tableprops deletetable",
    },
    help: { title: "Help", items: "help" },
  },
  toolbar,
  promotion: false,
  branding: false,
  elementpath: false,
  automatic_uploads: true,
  // images_upload_url:"",
  content_style: "img {width:100%;}",
  // width: 1000,
  height: props.height,
  async images_upload_handler(blobInfo, progress) {
    // console.log({blobInfo})
    const file = blobInfo.blob(); //转化为易于理解的file对象
    const size = props.size || process.env.ALIOSS_SIZE;
    if (file.size > utils.parseSize(size)) {
      const error = new Error(`图片太大，不能超过${size}`);
      error.remove = true;
      throw error;
    }
    const url = await Alioss.uploadImage({ file, size });
    return url;
    // return blobInfo.base64()
  },
  plugins: "lists link image table code help wordcount",
};
</script>
<template>
  <Editor
    :modelValue="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    :init="editorOptions"
  />
</template>
