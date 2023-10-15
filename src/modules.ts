import { internalModuleCall, modules } from "./queries.js";
import { CID, SignedRegistryEntry } from "@lumeweb/libs5";
import { Level } from "level";

let moduleStore: Level<string, Uint8Array>;

const CORE_MODULES = {
  swarm: "zrjTDyEX8Mh2PdDdRj5YL2byFGrYe1ksczRwPaTRFaCGSMG",
  peerDiscoveryRegistry: "zrjD6CEchDtSex5VHjzMNSAdkJpMNfCtbxSnftgtfvtnsdY",
  ircPeerDiscovery: "zrjHTx8tSQFWnmZ9JzK7XmJirqJQi2WRBLYp3fASaL2AfBQ",
  s5: "zrjLjKVByzt233rfcjWvTQXrMfGFa11oBLydPaUk7gwnC2d",
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
