import axios from "axios";
import useStore from "~/composables/useStore";

const { loading, version } = useStore();
// Prefer an explicit build-time override (Vite: VITE_API_BASE). Otherwise use a relative
// '/api' so axios resolves it against the current origin in browsers.
// This avoids directly depending on window.location and allows SSR or worker builds to
// supply an absolute URL via env when needed.
const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : '/api'

const myAxios = axios.create({
  baseURL,
  // caution, if set too short, Axios will actively cancel the request,
  // nginx may still be processing this request and succeed later,
  // but the front end thinks it failed
  timeout: 0,
});

// Add a request interceptor
myAxios.interceptors.request.use(
  function (config) {
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
    loading.value = false;
    return response;
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
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
    responseType: "json",
    responseEncoding: "utf8",
    ...config,
  });
}

export const Http = {
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


const axiosWrapper = async (...args) => {
  const resp = await myAxios(...args);
  if (!resp) {
    throw new Error("");
  }
  return resp;
};

export { myAxios as axios, axiosWrapper as request };
