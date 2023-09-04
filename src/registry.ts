const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b:
      "zduLvD6fRRmCy97T6RweYaPTxHdwFJmvmoygB4hCu3sJnZjHiYCKke4cG7",
    // peerDiscoveryRegistry
    zdiLW9MtAAMssP5vLBgd1FitouiVXzNUYZszFYG44uVKqCPDqUQox9aq1y:
      "zduTMSXg16HNi4ggDz8uko7ZxX7q9yosGBT8MX2ng43epttTEQ3Xi7pr2B",
    // ircPeerDiscovery
    zdiLZaKjWwXkMU88GNEWf6d5NREHe1Yk4M7eQm1owSC4ezeqFGGuGpfYXR:
      "zduGKansawKCn6Uzr9sPKVbVkdJCgUVL1mizy38t7tHvUxfEGQMC14R3EP",
    // s5
    zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo:
      "zduKLoxH3mmw2kHkkV18H2MLy99sA1RmFgarte63ng5WD39FmbeUXtB7iX",
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
    return DEFAULT_MODULE_REGISTRY.get(pubkey) as string;
  }

  return null;
}
