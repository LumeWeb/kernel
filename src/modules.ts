import { internalModuleCall, modules } from "./queries.js";
import { CID, SignedRegistryEntry } from "@lumeweb/libs5";
import { Level } from "level";

let moduleStore: Level<string, Uint8Array>;

const CORE_MODULES = {
  swarm: "zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b",
  peerDiscoveryRegistry:
    "zdiLW9MtAAMssP5vLBgd1FitouiVXzNUYZszFYG44uVKqCPDqUQox9aq1y",
  ircPeerDiscovery: "zrjPHvVJ3j7Jfn834PV4n7KcWbSW7ZHkxvcPCKWjwAcjPX5",
  s5: "zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo",
  networkRegistry: "zrjTCwTcK5Vco1h7cdUQKzs6yzeqm7vC5u5Lo9y1uhTyxnv",
};

export async function networkReady() {
  for (const module of [CORE_MODULES.swarm]) {
    if (!moduleLoaded(module)) {
      return false;
    }
  }
  const resolvers = await internalModuleCall(CORE_MODULES.swarm, "getRelays");

  return resolvers.length > 0;
}

function moduleLoaded(module: string) {
  return module in modules;
}

export async function resolveModuleRegistryEntry(module: string) {
  const cid = CID.decode(module);

  const pubkey = cid.hash.fullBytes;

  const signedEntry = (await internalModuleCall(
    CORE_MODULES.s5,
    "getRegistryEntry",
    { pubkey },
  )) as SignedRegistryEntry;

  return CID.fromRegistry(signedEntry.data).toString();
}

async function initStore() {
  if (moduleStore) {
    return;
  }

  const db = new Level<string, Uint8Array>("kernel-module-store");
  await db.open();

  moduleStore = db;
}

export async function store() {
  if (!moduleStore) {
    await initStore();
  }

  return moduleStore;
}
