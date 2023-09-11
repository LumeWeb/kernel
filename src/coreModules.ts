import { internalModuleCall, modules } from "./queries.js";
import { CID, SignedRegistryEntry } from "@lumeweb/libs5";

const CORE_MODULES = {
  swarm: "zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b",
  peerDiscoveryRegistry:
    "zdiLW9MtAAMssP5vLBgd1FitouiVXzNUYZszFYG44uVKqCPDqUQox9aq1y",
  ircPeerDiscovery:
    "zdiN5eJ3RfHpZHTYorGxBt1GCsrGJYV9GprwVWkj8snGsjWSrptFm8BtQX",
  s5: "zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo",
  networkRegistry: "zdiVGkiECt8CT7psN5wsQyNHewyRJLjPhAGwYGTRXPyAPXP21bdupzHyaw",
};

export async function networkReady() {
  for (const module of [
    CORE_MODULES.peerDiscoveryRegistry,
    CORE_MODULES.ircPeerDiscovery,
    CORE_MODULES.swarm,
  ]) {
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
