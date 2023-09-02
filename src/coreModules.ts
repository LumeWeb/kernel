import { internalModuleCall, modules } from "./queries.js";
import { SignedRegistryEntry } from "@lumeweb/libs5";
import { base58btc } from "multiformats/bases/base58";
import { decodeCid } from "@lumeweb/libweb";

const CORE_MODULES = {
  swarm: "z3o47ar8NBrnaEneBVzZD7QuMRMXjDtQDCpt4xP6mhsdw1cjnJ8mQKfNKGv3",
  peerDiscoveryRegistry:
    "z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR",
  ircPeerDiscovery:
    "z3o47admQjBj2QUrwHhvTB3nV1cBwQ5ZaKF7P5WELXeRyzzvBZr33QMJWTLs",
  s5: "z3o47hB2zLuvBMFaWa55SmbFQe3u97dWUG4fssXXTEcT4ZvnPkPaRF14b1EF",
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
  const [cid] = decodeCid(module);

  const pubkey = cid.hash;

  const signedEntry = (await internalModuleCall(
    CORE_MODULES.s5,
    "getRegistryEntry",
    { pubkey },
  )) as SignedRegistryEntry;

  return base58btc.encode(signedEntry.data);
}
