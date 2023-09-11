import { hexToBytes } from "@lumeweb/libweb";

export const activeKey = hexToBytes(
  globalThis.localStorage.getItem("key") as string,
);
