import QRCode from "qrcode";

const getQRcode = async (url) => {
  return await QRCode.toDataURL(url);
};

export default getQRcode;
