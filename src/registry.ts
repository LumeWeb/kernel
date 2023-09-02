const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    z3o47ar8NBrnaEneBVzZD7QuMRMXjDtQDCpt4xP6mhsdw1cjnJ8mQKfNKGv3:
      "zduKEY6Z4xJ4mraWy3hCbx1TmBxueCtHCFdnjjoiX7fGJdrZAcJHTyJmbu",
    // peerDiscoveryRegistry
    z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR:
      "z3o47aaLSspwrXzmu5mjuHPwaq3gRbyYQ3jL9RM1ammuHGB7uxSFBK2dRjqR",
    // ircPeerDiscovery
    z3o47admQjBj2QUrwHhvTB3nV1cBwQ5ZaKF7P5WELXeRyzzvBZr33QMJWTLs:
      "zduLx8mxrSWBPpTby1n9GtvxmCu6DwK9bsu26AgxesJmeEcWrVAF4NX7QK",
    // s5
    z3o47hB2zLuvBMFaWa55SmbFQe3u97dWUG4fssXXTEcT4ZvnPkPaRF14b1EF:
      "zduPehBQc2edPXDBsxo9CM6pTnS6bpDx1MBS92GH5wLAqMnErsVKhnobD1",
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
