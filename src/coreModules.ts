import { internalModuleCall, modules } from "./queries.js";
import { SignedRegistryEntry } from "@lumeweb/libs5";
import { base58btc } from "multiformats/bases/base58";

const CORE_MODULES = {
  swarm: "z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR",
  peerDiscoveryRegistry:
    "z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR",
  ircPeerDiscovery:
    "z3o47admQjBj2QUrwHhvTB3nV1cBwQ5ZaKF7P5WELXeRyzzvBZr33QMJWTLs",
  s5: "z3o47hB2zLuvBMFaWa55SmbFQe3u97dWUG4fssXXTEcT4ZvnPkPaRF14b1EF",
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
