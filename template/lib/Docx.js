// import { createReport } from "docx-templates/lib/browser.js";
// import { createReport } from "https://unpkg.com/docx-templates/lib/browser.js";
import createReport from "docx-templates";
import docxTemplates from "@/docx";

// https://github.com/guigrpa/docx-templates#browser-usage

const mimeType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const downloadURL = (url, fileName) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = "display: none";
  a.click();
  a.remove();
};
const saveBufferToFile = (buffer, fileName) => {
  const blob = new Blob([buffer], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};
async function getDocxTemplate(url) {
  if (!url) {
    return null;
  }
  const response = await Http.get(url, { responseType: "arraybuffer" });
  return response.data;
}
async function toBuffer({ templateName, buffer, url, data, context, ...options }) {
  const template = buffer ?? docxTemplates[templateName] ?? (await getDocxTemplate(url));
  if (!template) {
    throw new Error(`you at least provide templateName or buffer or url to toBuffer`);
  }
  return await createReport({
    data,
    template,
    cmdDelimiter: ["|", "|"],
    literalXmlDelimiter: "||", // http://officeopenxml.com/anatomyofOOXML.php
    processLineBreaks: true,
    noSandbox: true,
    additionalJsContext: context,
    ...options,
  });
}

async function saveTemplate({
  templateName,
  filename,
  buffer,
  url,
  data,
  context,
  ...options
}) {
  const docxBuffer = await toBuffer({
    templateName,
    buffer,
    url,
    data,
    context,
    ...options,
  });
  const saveName = filename || templateName;
  saveBufferToFile(
    docxBuffer,
    !saveName.endsWith(".docx") ? saveName + ".docx" : saveName,
  );
  return docxBuffer;
}

async function uploadBufferToOss({ buffer, filename, prefix }) {
  const body = new FormData();
  // let token = Math.random().toString(36).substr(2)
  const key = `${prefix || ""}${filename}.docx`;
  const file = new Blob([buffer], { type: mimeType });
  const { data: payload } = await Http.post(process.env.ALIOSS_PAYLOAD_URL, {
    key,
    size: "10m",
    lifetime: process.env.ALIOSS_LIFETIME,
  });
  for (const [name, value] of Object.entries(payload)) {
    body.append(name, value);
  }
  // key必须放到最后append,否则阿里云无法识别
  body.append("key", key);
  body.append("file", file);
  await Http.post(process.env.ALIOSS_URL, body);
  return process.env.ALIOSS_URL + key;
}

const Docx = {
  uploadBufferToOss,
  toBuffer,
  saveTemplate,
};
export default Docx;
