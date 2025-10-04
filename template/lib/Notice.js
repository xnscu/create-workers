import { notification } from "ant-design-vue";
// import "ant-design-vue/lib/notification/style/css";

const defaultOpts = {
  duration: 6,
};
class Notice {
  constructor(opts) {
    notification[opts.type](opts);
  }
  static success(message, opts) {
    notification.success({
      placement: "topRight",
      ...defaultOpts,
      ...opts,
      message,
    });
  }
  static error(message, opts) {
    notification.error({
      placement: "topRight",
      duration: 0,
      ...opts,
      message,
    });
  }
  static info(message, opts) {
    notification.info({
      placement: "topRight",
      ...opts,
      message,
    });
  }
}

export default Notice;
