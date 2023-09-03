const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b:
      "zduMnWZNBBk7yjTX46sP3Frbnx8btaVjn7ozKb3jgdWpJqH14Kn8Qk31LK",
    // peerDiscoveryRegistry
    zdiLW9MtAAMssP5vLBgd1FitouiVXzNUYZszFYG44uVKqCPDqUQox9aq1y:
      "zduJceGhVmwR6wf2xUhJp9juU6rabynbi8mFwmBcKEaP8nc1mXyrDyRMmy",
    // ircPeerDiscovery
    zdiLZaKjWwXkMU88GNEWf6d5NREHe1Yk4M7eQm1owSC4ezeqFGGuGpfYXR:
      "zduLx8mxrSWBPpTby1n9GtvxmCu6DwK9bsu26AgxesJmeEcWrVAF4NX7QK",
    // s5
    zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo:
      "zduHdVUg8SUJQ5dwx1LnesjMTxDFxireNrppRng7z14QDZnqZCCiiWtcT9",
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
