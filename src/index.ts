import { logLargeObjects } from "./logLargeState.js";
import { log, logErr } from "./log.js";
import { KERNEL_DISTRO, KERNEL_VERSION } from "./version.js";
import {
  maybeInitDefaultPortals,
  setActivePortalMasterKey,
} from "@lumeweb/libweb";
import { Client } from "@lumeweb/libportal";
import { addContextToErr } from "@lumeweb/libkernel";
import { handleIncomingMessage } from "./message.js";
import { activeKey } from "./key.js";

declare global {
  interface Window {
    bootloaderPortals: Client[];
  }
}

// Kick off the thread that will periodically log all of the large objects in
// the kernel, so that it's easier to check for memory leaks.
logLargeObjects();

// Write a log that declares the kernel version and distribution.
log("init", "Lume Web Kernel v" + KERNEL_VERSION + "-" + KERNEL_DISTRO);

/*
    Try to load either our saved portal(s) or the default portal(s)
 */
setActivePortalMasterKey(activeKey);

let [, portalLoadErr] = maybeInitDefaultPortals();
if (portalLoadErr) {
  let err = addContextToErr(portalLoadErr, "unable to init portals");
  logErr(err);
}

if (!portalLoadErr) {
  window.addEventListener("message", handleIncomingMessage);
}
