import { watch } from "vue";
import { useBreakpoints, useWindowSize } from "@vueuse/core";

/**
 * 响应式的窗口大小监听组合式函数
 * @param {Object} options 配置选项
 * @param {number} [options.mobileBreakpoint=768] 移动设备断点宽度
 * @param {Function} [options.onResize] 自定义resize回调函数
 * @returns {Object} 返回窗口相关的响应式状态
 */
export function useWindowResize(options = {}) {
  const { mobileBreakpoint = 768, onResize: customOnResize } = options;

  const breakpoints = useBreakpoints({
    mobile: mobileBreakpoint,
  });
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = breakpoints.smaller("mobile");

  if (customOnResize) {
    watch(
      [windowWidth, windowHeight, isMobile],
      () => {
        customOnResize({
          width: windowWidth.value,
          height: windowHeight.value,
          isMobile: isMobile.value,
        });
      },
      { immediate: true },
    );
  }

  return {
    windowWidth,
    windowHeight,
    isMobile,
  };
}
