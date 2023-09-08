import { internalModuleCall, modules } from "./queries.js";
import { SignedRegistryEntry, CID } from "@lumeweb/libs5";

const CORE_MODULES = {
  swarm: "zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b",
  peerDiscoveryRegistry:
    "zdiLW9MtAAMssP5vLBgd1FitouiVXzNUYZszFYG44uVKqCPDqUQox9aq1y",
  ircPeerDiscovery:
    "zdiLZaKjWwXkMU88GNEWf6d5NREHe1Yk4M7eQm1owSC4ezeqFGGuGpfYXR",
  s5: "zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo",
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

  const pubkey = cid.hash;

  const signedEntry = (await internalModuleCall(
    CORE_MODULES.s5,
    "getRegistryEntry",
    { pubkey },
  )) as SignedRegistryEntry;

  const entry = CID.fromRegistry(signedEntry.data);
}
