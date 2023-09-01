import { modules } from "#queries.js";
import { internalModuleCall } from "./queries.js";
import { SignedRegistryEntry } from "@lumeweb/libs5";
import { base58btc } from "multiformats/bases/base58";

const CORE_MODULES = {
  swarm: "",
  peerDiscoveryRegistry: "",
  ircPeerDiscovery: "",
  s5: "",
};

export default CORE_MODULES;

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

  const resolvers = await internalModuleCall(
    CORE_MODULES.peerDiscoveryRegistry,
    "getRelays",
  );

  return resolvers.length > 0;
}

function moduleLoaded(module: string) {
  return module in modules;
}

export async function resolveModuleRegistryEntry(pubkey: string) {
  const signedEntry = (await internalModuleCall(
    CORE_MODULES.s5,
    "getRegistryEntry",
    { pubkey },
  )) as SignedRegistryEntry;

  return base58btc.encode(signedEntry.data);
}
