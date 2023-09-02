const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    z3o47ar8NBrnaEneBVzZD7QuMRMXjDtQDCpt4xP6mhsdw1cjnJ8mQKfNKGv3:
      "zduTR1y921Erd52dYq1DKLpA9J6sw8g8KPfUdbkqmwdXDGKCjQKL4SHvDd",
    // peerDiscoveryRegistry
    z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR:
      "zduJceGhVmwR6wf2xUhJp9juU6rabynbi8mFwmBcKEaP8nc1mXyrDyRMmy",
    // ircPeerDiscovery
    z3o47admQjBj2QUrwHhvTB3nV1cBwQ5ZaKF7P5WELXeRyzzvBZr33QMJWTLs:
      "zduLx8mxrSWBPpTby1n9GtvxmCu6DwK9bsu26AgxesJmeEcWrVAF4NX7QK",
    // s5
    z3o47hB2zLuvBMFaWa55SmbFQe3u97dWUG4fssXXTEcT4ZvnPkPaRF14b1EF:
      "zduTZ7NBNtGxQxbAaDNcp7d1xta7y2MXKnjvVA3m29ohwBeeLHL1GieTPd",
  }),
);
const REGISTRY_ITEM_ID = "registry";

Object.freeze(DEFAULT_MODULE_REGISTRY);

export function getSavedRegistryEntry(pubkey: string) {
  const savedEntries = new Map<string, string>(
    Object.entries(window.localStorage.getItem(REGISTRY_ITEM_ID) ?? {}),
  );

  if (savedEntries.has(pubkey)) {
    return savedEntries.get(pubkey) as string;
  }

  if (DEFAULT_MODULE_REGISTRY.has(pubkey)) {
    DEFAULT_MODULE_REGISTRY.get(pubkey) as string;
  }

  return null;
}
