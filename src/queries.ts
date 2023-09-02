import { notableErrors, respondErr } from "./err.js";
import { log, logErr } from "./log.js";
import { activeKey } from "./key.js";
import { KERNEL_DISTRO, KERNEL_VERSION } from "./version.js";
import {
  addContextToErr,
  bufToB64,
  encodeU64,
  Err,
  objAsString,
  sha512,
} from "@lumeweb/libkernel";
import {
  CID,
  decodeCid,
  deriveChildKey,
  downloadSmallObject,
  verifyCid,
} from "@lumeweb/libweb";
import { CID_TYPES, CID_HASH_TYPES } from "@lumeweb/libs5";
import type { moduleQuery, presentKeyData } from "@lumeweb/libkernel/module";
import { readableStreamToUint8Array } from "binconv";
import { getSavedRegistryEntry } from "./registry.js";
import { defer } from "@lumeweb/libkernel/module";
import { networkReady, resolveModuleRegistryEntry } from "./coreModules.js";

// WorkerLaunchFn is the type signature of the function that launches the
// worker to set up for processing a query.
type WorkerLaunchFn = () => [Worker, Err];

// modules is a hashmap that maps from a domain to the module that handles
// queries to that domain. It maintains the domain and URL of the module so
// that the worker doesn't need to be downloaded multiple times to keep
// launching queries.
//
// a new worker gets launched for every query.
interface Module {
  domain: string;
  url: string;
  launchWorker: WorkerLaunchFn;
  worker?: Worker;
}

// OpenQuery holds all of the information necessary for managing an open query.
interface OpenQuery {
  isWorker: boolean;
  isInternal: boolean;
  internalHandler?: (message: OpenQueryResponse) => void;
  domain: string;
  source: any;
  dest: Worker;
  nonce: string;
  origin: string;
}

interface OpenQueryResponse {
  nonce: string;
  method: string;
  data: any;
  err?: any;
}

// Define the stateful variables for managing the modules. We track the set of
// queries that are in progress, the set of skapps that are known to the
// kernel, the set of modules that we've downloaded, and the set of modules
// that are actively being downloaded.
let queriesNonce = 0;
const queries = {} as { [module: string]: OpenQuery };
const modules = {} as any;
const modulesLoading = {} as any;

// Create a standard message handler for messages coming from workers.
//
// TODO: If the worker makes a mistake or has a bug that makes it seem
// unstable, we should create some sort of debug log that can be viewed from
// the kernel debug/control panel. We'll need to make sure the debug logs don't
// consume too much memory, and we'll need to terminate workers that are
// bugging out.
//
// TODO: Set up a ratelimiting system for modules making logs, we don't want
// modules to be able to pollute the kernel and cause instability by logging
// too much.
//
// TODO: Need to check that the postMessage call in respondErr isn't going to
// throw or cause issuse in the event that the worker who sent the message has
// been terminated.
//
// TODO: We probably need to have timeouts for queries, if a query doesn't send
// an update after a certain amount of time we drop it.
function handleWorkerMessage(event: MessageEvent, mod: Module, worker: Worker) {
  // TODO: Use of respondErr here may not be correct, should only be using
  // respondErr for functions that are expecting a response and aren't
  // already part of a separate query. If they are part of a separate query
  // we need to close that query out gracefully.

  // Perform input verification for a worker message.
  if (!("method" in event.data)) {
    logErr("worker", mod.domain, "received worker message with no method");
    respondErr(event, worker, true, "received message with no method");
    return;
  }

  // Check whether this is a logging call.
  if (event.data.method === "log") {
    // Perform the input verification for logging.
    if (!("data" in event.data)) {
      logErr(
        "worker",
        mod.domain,
        "received worker log message with no data field",
      );
      respondErr(
        event,
        worker,
        true,
        "received log messsage with no data field",
      );
      return;
    }
    if (typeof event.data.data.message !== "string") {
      logErr(
        "worker",
        mod.domain,
        "worker log data.message is not of type 'string'",
      );
      respondErr(
        event,
        worker,
        true,
        "received log messsage with no message field",
      );
      return;
    }
    if (event.data.data.isErr === undefined) {
      event.data.data.isErr = false;
    }
    if (typeof event.data.data.isErr !== "boolean") {
      logErr(
        "worker",
        mod.domain,
        "worker log data.isErr is not of type 'boolean'",
      );
      respondErr(
        event,
        worker,
        true,
        "received log messsage with invalid isErr field",
      );
      return;
    }

    // Send the log to the parent so that the log can be put in the
    // console.
    if (event.data.data.isErr === false) {
      log("worker", "[" + mod.domain + "]", event.data.data.message);
    } else {
      logErr("worker", "[" + mod.domain + "]", event.data.data.message);
    }
    return;
  }

  // Check for a nonce - log is the only message from a worker that does not
  // need a nonce.
  if (!("nonce" in event.data)) {
    event.data.nonce = "N/A";
    logErr(
      "worker",
      mod.domain,
      "worker sent a message with no nonce",
      event.data,
    );
    respondErr(event, worker, true, "received message with no nonce");
    return;
  }

  // Handle a version request.
  if (event.data.method === "version") {
    worker.postMessage({
      nonce: event.data.nonce,
      method: "response",
      err: null,
      data: {
        distribution: KERNEL_DISTRO,
        version: KERNEL_VERSION,
        err: null,
      },
    });
    return;
  }

  // Handle a call from the worker to another module.
  if (event.data.method === "moduleCall") {
    handleModuleCall(event, worker, mod.domain, true, false);
    return;
  }

  // The only other methods allowed are the queryUpdate, responseUpdate,
  // and response methods.
  const isQueryUpdate = event.data.method === "queryUpdate";
  const isResponseUpdate = event.data.method === "responseUpdate";
  const isResponse = event.data.method === "response";
  if (isQueryUpdate || isResponseUpdate || isResponse) {
    handleModuleResponse(event, mod, worker);
    return;
  }

  // We don't know what this message was.
  logErr(
    "worker",
    mod.domain,
    "received message from worker with unrecognized method",
  );
}

// createModule will create a module from the provided worker code and domain.
// This call does not launch the worker, that should be done separately.
async function createModule(
  workerCode: Uint8Array | ReadableStream,
  domain: string,
): Promise<[Module | null, Err]> {
  if (workerCode instanceof ReadableStream) {
    try {
      workerCode = await readableStreamToUint8Array(workerCode);
    } catch (e) {
      return [null, e];
    }
  }

  // Generate the URL for the worker code.
  const url = URL.createObjectURL(new Blob([workerCode]));

  // Create the module object.
  const mod: Module = {
    domain,
    url,
    launchWorker: function (): [Worker, Err] {
      return launchWorker(mod);
    },
  };

  // Start worker
  const [worker, err] = mod.launchWorker();
  if (err !== null) {
    return [{} as Module, addContextToErr(err, "unable to launch worker")];
  }
  mod.worker = worker;

  return [mod, null];
}

// launchWorker will launch a worker and perform all the setup so that the
// worker is ready to receive a query.
function launchWorker(mod: Module): [Worker, Err] {
  // Create and launch the worker.
  let worker: Worker;
  try {
    worker = new Worker(mod.url);
  } catch (err: any) {
    logErr("worker", mod.domain, "unable to create worker", mod.domain, err);
    return [
      {} as Worker,
      addContextToErr(objAsString(err), "unable to create worker"),
    ];
  }

  // Set the onmessage and onerror functions.
  worker.onmessage = function (event: MessageEvent) {
    handleWorkerMessage(event, mod, worker);
  };
  worker.onerror = function (event: ErrorEvent) {
    const errStr =
      objAsString(event.message) +
      "\n" +
      objAsString(event.error) +
      "\n" +
      objAsString(event);
    logErr(
      "worker",
      mod.domain,
      addContextToErr(errStr, "received onerror event"),
    );
  };

  // Send the key to the module.
  const path = "moduleKeyDerivation" + mod.domain;
  const moduleKey = deriveChildKey(activeKey, path);
  const msgData: presentKeyData = {
    key: moduleKey,
    rootPrivateKey: activeKey,
    // @ts-ignore
    rootKey: activeKey,
  };
  const msg: moduleQuery = {
    method: "presentKey",
    domain: "root",
    data: msgData,
  };

  worker.postMessage(msg);
  return [worker, null];
}

// handleModuleCall will handle a callModule message sent to the kernel from an
// extension or webpage.
async function handleModuleCall(
  event: MessageEvent,
  messagePortal: any,
  callerDomain: string,
  isWorker: boolean,
  isInternal: false | ((message: OpenQueryResponse) => void),
) {
  if (!("data" in event.data) || !("module" in event.data.data)) {
    logErr(
      "moduleCall",
      "received moduleCall with no module field in the data",
      event.data,
    );
    respondErr(
      event,
      messagePortal,
      isWorker,
      "moduleCall is missing 'module' field: " + JSON.stringify(event.data),
    );
    return;
  }

  let validCid = false;
  let isResolver = false;
  if (
    typeof event.data.data.module === "string" &&
    verifyCid(event.data.data.module)
  ) {
    const decodedCid = decodeCid(event.data.data.module);
    if (!decodedCid[1]) {
      const { type, hashType } = decodedCid[0];
      if (type === CID_TYPES.RAW && hashType === CID_HASH_TYPES.BLAKE3) {
        validCid = true;
      }
      if (type === CID_TYPES.RESOLVER && hashType === CID_HASH_TYPES.ED25519) {
        validCid = true;
        isResolver = true;
      }
    }
  }

  if (!validCid) {
    logErr("moduleCall", "received moduleCall with malformed module");
    respondErr(
      event,
      messagePortal,
      isWorker,
      "'module' field in moduleCall is expected to be a raw CID or a resolver CID",
    );
    return;
  }
  if (!("method" in event.data.data)) {
    logErr(
      "moduleCall",
      "received moduleCall without a method set for the module",
    );
    respondErr(
      event,
      messagePortal,
      isWorker,
      "no 'data.method' specified, module does not know what method to run",
    );
    return;
  }
  if (typeof event.data.data.method !== "string") {
    logErr(
      "moduleCall",
      "received moduleCall with malformed method",
      event.data,
    );
    respondErr(
      event,
      messagePortal,
      isWorker,
      "'data.method' needs to be a string",
    );
    return;
  }
  if (event.data.data.method === "presentSeed") {
    logErr(
      "moduleCall",
      "received malicious moduleCall - only root is allowed to use presentSeed method",
    );
    respondErr(
      event,
      messagePortal,
      isWorker,
      "presentSeed is a privileged method, only root is allowed to use it",
    );
    return;
  }
  if (!("data" in event.data.data)) {
    logErr("moduleCall", "received moduleCall with no input for the module");
    respondErr(
      event,
      messagePortal,
      isWorker,
      "no field data.data in moduleCall, data.data contains the module input",
    );
    return;
  }

  let moduleDomain = event.data.data.module; // Can change with overrides.
  let finalModule = moduleDomain; // Can change with overrides.

  if (isResolver) {
    const registryFail = () => {
      logErr("moduleCall", "received moduleCall with no known registry entry");
      respondErr(
        event,
        messagePortal,
        isWorker,
        "registry entry for module is not found",
      );
    };

    finalModule = getSavedRegistryEntry(moduleDomain);
    if (!finalModule) {
      if (!(await networkReady())) {
        registryFail();
        return;
      }
      let resolvedModule;

      try {
        resolvedModule = await resolveModuleRegistryEntry(finalModule);
      } catch (e) {
        registryFail();
        return;
      }
      finalModule = resolvedModule;
    }
  }
  // Define a helper function to create a new query to the module. It will
  // both open a query on the module and also send an update message to the
  // caller with the kernel nonce for this query so that the caller can
  // perform query updates.
  const newModuleQuery = function (mod: Module) {
    let worker = mod.worker!;

    // Get the nonce for this query. The nonce is a
    // cryptographically secure string derived from a number and
    // the user's seed. We use 'kernelNonceSalt' as a salt to
    // namespace the nonces and make sure other processes don't
    // accidentally end up using the same hashes.
    const nonceSalt = new TextEncoder().encode("kernelNonceSalt");
    const [nonceBytes] = encodeU64(BigInt(queriesNonce));
    const noncePreimage = new Uint8Array(
      nonceSalt.length + activeKey.length + nonceBytes.length,
    );
    noncePreimage.set(nonceSalt, 0);
    noncePreimage.set(activeKey, nonceSalt.length);
    noncePreimage.set(nonceBytes, nonceSalt.length + activeKey.length);
    const nonce = bufToB64(sha512(noncePreimage));
    queriesNonce = queriesNonce + 1;
    queries[nonce] = {
      isWorker,
      isInternal: !!isInternal,
      internalHandler: isInternal ?? undefined,
      domain: callerDomain,
      source: messagePortal,
      dest: worker,
      nonce: event.data.nonce,
      origin: event.origin,
    } as OpenQuery;

    // Send the message to the worker to start the query.
    worker.postMessage({
      nonce: nonce,
      domain: callerDomain,
      method: event.data.data.method,
      data: event.data.data.data,
    });

    // If the caller is asking for the kernel nonce for this query,
    // send the kernel nonce. We don't always send the kernel nonce
    // because messages have material overhead.
    if (event.data.sendKernelNonce === true) {
      const msg = {
        nonce: event.data.nonce,
        method: "responseNonce",
        data: {
          nonce,
        },
      };
      if (isWorker) {
        messagePortal.postMessage(msg);
      } else {
        messagePortal.postMessage(msg, event.origin);
      }
    }
  };

  // Check the worker pool to see if this module is already available.
  if (moduleDomain in modules) {
    const module = modules[moduleDomain];
    newModuleQuery(module);
    return;
  }

  // Check if another thread is already fetching the module.
  if (moduleDomain in modulesLoading) {
    const p = modulesLoading[moduleDomain];
    p.then((errML: Err) => {
      if (errML !== null) {
        respondErr(
          event,
          messagePortal,
          isWorker,
          addContextToErr(errML, "module could not be loaded"),
        );
        return;
      }
      const module = modules[moduleDomain];
      newModuleQuery(module);
    });
    return;
  }

  // Fetch the module in a background thread, and launch the query once the
  // module is available.
  modulesLoading[moduleDomain] = new Promise(async (resolve) => {
    // TODO: Check localStorage for the module.

    // Download the code for the worker.
    const [moduleData, errDS] = await downloadSmallObject(finalModule);
    if (errDS !== null) {
      const err = addContextToErr(errDS, "unable to load module");
      respondErr(event, messagePortal, isWorker, err);
      resolve(err);
      delete modulesLoading[moduleDomain];
      return;
    }

    // The call to download the skylink is async. That means it's possible that
    // some other thread created the module successfully and already added it.
    // Based on the rest of the code, this should not be possible, but we check
    // for it anyway at runtime so that any concurrency bugs will be made
    // visible through the `notableErrors` field.
    //
    // This check is mainly here as a verification that the rest of the kernel
    // code is correct.
    if (moduleDomain in modules) {
      // Though this is an error, we do already have the module so we
      // use the one we already loaded.
      logErr("a module that was already loaded has been loaded");
      notableErrors.push("module loading experienced a race condition");
      const mod = modules[moduleDomain];
      newModuleQuery(mod);
      resolve(null);
      return;
    }

    // TODO: Save the result to localStorage. Can't do that until
    // subscriptions are in place so that localStorage can sync
    // with any updates from the remote module.

    // Create a new module.
    const [mod, errCM] = await createModule(moduleData, moduleDomain);
    if (errCM !== null) {
      const err = addContextToErr(errCM, "unable to create module");
      respondErr(event, messagePortal, isWorker, err);
      resolve(err);
      delete modulesLoading[moduleDomain];
      return;
    }
    modules[moduleDomain] = mod as Module;
    newModuleQuery(mod as Module);
    resolve(null);
    delete modulesLoading[moduleDomain];
  });
}

function handleModuleResponse(
  event: MessageEvent,
  mod: Module,
  worker: Worker,
) {
  // TODO: Need to figure out what to do with the errors here. Do we call
  // 'respondErr'? That doesn't seem correct. It's not correct because if we
  // end a query we need to let both sides know that the query was killed by
  // the kernel.

  // Technically the caller already computed these values, but it's easier to
  // compute them again than to pass them as function args.
  const isQueryUpdate = event.data.method === "queryUpdate";
  const isResponse = event.data.method === "response";

  // Check that the data field is present.
  if (!("data" in event.data)) {
    logErr(
      "worker",
      mod.domain,
      "received response or update from worker with no data field",
    );
    return;
  }

  // Grab the query information so that we can properly relay the worker
  // response to the original caller.
  if (!(event.data.nonce in queries)) {
    // If there's no corresponding query and this is a response, send an
    // error.
    if (isResponse === true) {
      logErr("worker", mod.domain, "received response for an unknown nonce");
      return;
    }

    // If there's no responding query and this isn't a response, it could
    // just be an accident. queryUpdates and responseUpdates are async and
    // can therefore be sent before both sides know that a query has been
    // closed but not get processed untila afterwards.
    //
    // This can't happen with a 'response' message because the response
    // message is the only message that can close the query, and there's
    // only supposed to be one response message.
    return;
  }

  // If the message is a query update, relay the update to the worker.
  if (isQueryUpdate) {
    const dest = queries[event.data.nonce].dest;
    dest.postMessage({
      nonce: event.data.nonce,
      method: event.data.method,
      data: event.data.data,
    });
    return;
  }

  // Check that the err field is being used correctly for response messages.
  if (isResponse) {
    // Check that the err field exists.
    if (!("err" in event.data)) {
      logErr(
        "worker",
        mod.domain,
        "got response from worker with no err field",
      );
      return;
    }

    // Check that exactly one of 'err' and 'data' are null.
    const errNull = event.data.err === null;
    const dataNull = event.data.data === null;
    if (errNull === dataNull) {
      logErr("worker", mod.domain, "exactly one of err and data must be null");
      return;
    }
  }

  // We are sending either a response message or a responseUpdate message,
  // all other possibilities have been handled.
  const query = queries[event.data.nonce];
  const sourceIsWorker = query.isWorker;
  const sourceIsInternal = query.isInternal;
  const internalHandler = query.internalHandler;
  const sourceNonce = query.nonce;
  const source = query.source;
  const origin = query.origin;
  const msg: OpenQueryResponse = {
    nonce: sourceNonce,
    method: event.data.method,
    data: event.data.data,
  };
  // For responses only, set an error and close out the query by deleting it
  // from the query map.
  if (isResponse) {
    msg["err"] = event.data.err;
    delete queries[event.data.nonce];
  }

  if (sourceIsWorker) {
    source.postMessage(msg);
  } else if (sourceIsInternal) {
    internalHandler?.(msg);
  } else {
    source.postMessage(msg, origin);
  }
}

function handleQueryUpdate(event: MessageEvent) {
  // Check that the module still exists before sending a queryUpdate to
  // the module.
  if (!(event.data.nonce in queries)) {
    logErr(
      "auth",
      "received queryUpdate but nonce is not recognized",
      event.data,
      queries,
    );
    return;
  }
  const dest = queries[event.data.nonce].dest;
  dest.postMessage({
    nonce: event.data.nonce,
    method: event.data.method,
    data: event.data.data,
  });
}

export async function internalModuleCall(
  module: string,
  method: string,
  params = {},
): Promise<any> {
  const callDefer = defer();
  handleModuleCall(
    {
      data: {
        data: {
          module,
          method,
          data: params,
          nonce: 0,
        },
      },
      origin: "root",
    } as any,
    undefined,
    "root",
    false,
    (message) => {
      if (message.err) {
        callDefer.reject(message.err);
        return;
      }
      callDefer.resolve(message.data);
    },
  );

  return callDefer.promise;
}

export {
  Module,
  handleModuleCall,
  handleModuleResponse,
  handleQueryUpdate,
  modules,
  modulesLoading,
  queries,
};
