import { hexToBytes } from "@lumeweb/libweb";

export const activeKey = hexToBytes(
  window.localStorage.getItem("key") as string,
);
