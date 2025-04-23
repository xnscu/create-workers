// imports all .vue files from the views folder (first parameter is the path to your views)
const requireModule = require.context(".", false, /\.docx$/);

// create empty modules object
const modules = {};
// travers through your imports
requireModule.keys().forEach((item) => {
  // replace extension with nothing
  const moduleName = item.replace(/(\.\/|\.docx)/g, "");

  // add item to modules object
  modules[moduleName] = requireModule(item).default;
});

//export modules object
export default modules;
