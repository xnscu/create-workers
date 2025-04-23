import axios from "axios";
import useStore from "~/composables/useStore";

const viteEnv = import.meta.env;
const scheme = viteEnv.VITE_HTTPS == "on" ? "https" : "http";
const scheme_dev = viteEnv.VITE_HTTPS_DEV == "on" ? "https" : "http";
const baseURL =
  process.env.NODE_ENV == "production"
    ? `${scheme}://${window.location.host}`
    : `${scheme_dev}://${window.location.host}${viteEnv.VITE_PROXY_PREFIX}`;

const myAxios = axios.create({
  baseURL,
  timeout: 0, // 小心,如果设置得太短了, Axios会主动cancel请求, 有可能nginx仍在处理此请求后续成功,但前端认为没有成功
});

// Add a request interceptor
myAxios.interceptors.request.use(
  function (config) {
    const { loading, version } = useStore();
    loading.value = true;
    config.headers["X-Version"] = version.value;
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  },
);
// Add a response interceptor
myAxios.interceptors.response.use(
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Do something with response data
    const { loading } = useStore();
    loading.value = false;
    return response;
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    const { loading } = useStore();
    loading.value = false;
    throw error;
  },
);

async function post(url, data, config = {}) {
  return await myAxios({
    url,
    data,
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    responseType: "json", // 'arraybuffer', 'document', 'json', 'text', 'stream','blob'
    responseEncoding: "utf8",
    ...config,
  });
}

async function get(url, config = {}) {
  return await myAxios({
    url,
    method: "GET",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    responseType: "json", // 'arraybuffer', 'document', 'json', 'text', 'stream','blob'
    responseEncoding: "utf8",
    ...config,
  });
}

const Http = {
  post,
  get,
};

export const usePost = async (url, payload, config = {}) => {
  const { data } = await post(url, payload, config);
  return data;
};
export const useGet = async (url, config = {}) => {
  const { data } = await get(url, config);
  return data;
};
export default Http;

const axiosWrapper = async (...args) => {
  const resp = await myAxios(...args);
  if (!resp) {
    throw new Error("");
  }
  return resp;
};

export { myAxios as axios, axiosWrapper as request, Http };
