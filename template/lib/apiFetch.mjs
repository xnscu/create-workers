// apiFetch.js
const API_PREFIX = '/api';

function buildUrl(path) {
  if (/^(https?:)?\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return `${API_PREFIX}${normalizedPath}`;
}

async function apiFetch(path, {
  method = 'GET',
  headers = {},
  body = undefined,
  expect = null, // null = infer from response Content-Type; or 'json' | 'text' | 'blob'
  ...fetchOptions
} = {}) {
  const url = buildUrl(path);

  const finalHeaders = new Headers({
    'Accept': 'application/json',
    ...headers,
  });

  let finalBody = body;
  // 不对 GET/HEAD 设 body
  if (body != null && !['GET','HEAD'].includes(method.toUpperCase())) {
    if (body instanceof FormData) {
      // 浏览器会自动设置正确的 Content-Type（包含 boundary）
    } else if (typeof body === 'object') {
      finalHeaders.set('Content-Type', 'application/json;charset=utf-8');
      finalBody = JSON.stringify(body);
    } else {
      // string 或其他，用户已自行设定
    }
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: finalBody,
    credentials: 'same-origin', // 根据需要改成 'include'
    ...fetchOptions,
  });

  if (!res.ok) {
    let errText;
    try {
      errText = await res.text();
    } catch (e) {
      errText = res.statusText || 'Network error';
    }
    const err = new Error(errText);
    err.status = res.status;
    err.response = res;
    console.error(`HTTP ${res.status}: ${errText}`)
    throw err;
  }

  let finalExpect = expect;
  if (finalExpect == null) {
      // determine expected response format
    const contentType = (res.headers && res.headers.get)
      ? (res.headers.get('content-type') || '')
      : '';
    const ct = contentType.toLowerCase();
    if (ct.includes('application/json') || ct.includes('+json')) {
      finalExpect = 'json';
    } else if (
      ct.startsWith('image/') ||
      ct.startsWith('audio/') ||
      ct.startsWith('video/') ||
      ct.includes('application/octet-stream') ||
      ct.includes('application/pdf') ||
      ct.includes('application/zip') ||
      ct.includes('multipart/') ||
      ct.includes('application/vnd') ||
      ct.includes('application/x-')
    ) {
      finalExpect = 'blob';
    } else {
      // fallback to text for unknown/non-binary content
      finalExpect = 'text';
    }
  }

  if (finalExpect === 'json') {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } else if (finalExpect === 'text') {
    const text = await res.text();
    if (!text) return null;
    return text;
  } else if (finalExpect === 'blob') {
    return res.blob();
  }
}

export default apiFetch;

export const get = (path, options = {}) => apiFetch(path, { method: 'GET', ...options });
export const post = (path, body, options = {}) => apiFetch(path, { method: 'POST', body, ...options });