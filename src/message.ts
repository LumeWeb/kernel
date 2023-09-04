// Overwrite the handleIncomingMessage function that gets called at the end of the
// event handler, allowing us to support custom messages.
import { logErr } from "./log.js";
import { KERNEL_DISTRO, KERNEL_VERSION } from "./version.js";
import { notableErrors, respondErr } from "./err.js";
import { handleModuleCall, handleQueryUpdate } from "./queries.js";

export const handleIncomingMessage = function (event: any) {
  // Ignore all messages from ourself.
  if (event.source === window) {
    return;
  }

  // Input validation.
  if (!("method" in event.data)) {
    logErr("handleIncomingMessage", "kernel request is missing 'method' field");
    return;
  }
  if (!("nonce" in event.data)) {
    logErr(
      "handleIncomingMessage",
      "message sent to kernel with no nonce field",
      event.data,
    );
    return;
  }

  // Establish a debugging handler that a developer can call to verify
  // that round-trip communication has been correctly programmed between
  // the kernel and the calling application.
  //
  // It was easier to inline the message than to abstract it.
  if (event.data.method === "version") {
    event.source.postMessage(
      {
        nonce: event.data.nonce,
        method: "response",
        err: null,
        data: {
          distribution: KERNEL_DISTRO,
          version: KERNEL_VERSION,
        },
      },
      event.origin,
    );
    return;
  }

  // Establish a debugging handler to return any noteworthy errors that the
  // kernel has encountered. This is mainly intended to be used by the test
  // suite.
  if (event.data.method === "checkErrs") {
    event.source.postMessage(
      {
        nonce: event.data.nonce,
        method: "response",
        err: null,
        data: {
          errs: notableErrors,
        },
      },
      event.origin,
    );
    return;
  }

  // Establish handlers for the major kernel methods.
  if (event.data.method === "moduleCall") {
    // Check for a domain. If the message was sent by a browser
    // extension, we trust the domain provided by the extension,
    // otherwise we use the domain of the parent as the domain.
    // This does mean that the kernel is trusting that the user has
    // no malicious browser extensions, as we aren't checking for
    // **which** extension is sending the message, we are only
    // checking that the message is coming from a browser
    // extension.
    if (event.origin.startsWith("moz") && !("domain" in event.data)) {
      logErr(
        "moduleCall",
        "caller is an extension, but no domain was provided",
      );
      respondErr(
        event,
        event.source,
        false,
        false,
        "caller is an extension, but not domain was provided",
      );
      return;
    }
    let domain;
    if (event.origin.startsWith("moz")) {
      domain = event.data.domain;
    } else {
      domain = new URL(event.origin).hostname;
    }
    handleModuleCall(event, event.source, domain, false, false);
    return;
  }
  if (event.data.method === "queryUpdate") {
    handleQueryUpdate(event);
    return;
  }

  // Unrecognized method, reject the query.
  respondErr(
    event,
    event.source,
    false,
    false,
    "unrecognized method: " + event.data.method,
  );
};
