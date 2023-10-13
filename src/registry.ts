const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    zdiLmwHCC15afFNLYzzT2DVV7m27SrBde7oXHdSzAe95GpFZXzdpatUN6b:
      "zduLvD6fRRmCy97T6RweYaPTxHdwFJmvmoygB4hCu3sJnZjHiYCKke4cG7",
    // peerDiscoveryRegistry
    zrjD6CEchDtSex5VHjzMNSAdkJpMNfCtbxSnftgtfvtnsdY:
      "z2H7AhnortTD6wL53XUdTotJZLADa7PbZCcHuSFJ6WgZ6td2bvaC",
    // ircPeerDiscovery
    zrjPHvVJ3j7Jfn834PV4n7KcWbSW7ZHkxvcPCKWjwAcjPX5:
      "zHnoaikfFJ9T5hEhV53bj8h5U5qgZrocCbfmTkogqGdaMkjLiE",
    // s5
    zdiT6quMF8gh8BhQdXE7CZYhp8S1BxSgsucSS48WuTGdars1noejvak6Qo:
      "z2H734ocqpAoorkhUk3nymFuwS6uU6YcBUppCU7YvBiasRvsbJ6E",
    // networkRegistry
    zrjTCwTcK5Vco1h7cdUQKzs6yzeqm7vC5u5Lo9y1uhTyxnv:
      "z2H7J3strfaEAc1kyHqMNmEPzynRipVerfCeqEhfkkcrGNNhnJUo",
  }),
);
const REGISTRY_ITEM_ID = "registry";

Object.freeze(DEFAULT_MODULE_REGISTRY);

export function getSavedRegistryEntry(pubkey: string) {
  const savedEntries = new Map<string, string>(
    Object.entries(globalThis.localStorage.getItem(REGISTRY_ITEM_ID) ?? {}),
  );

  if (savedEntries.has(pubkey)) {
    return savedEntries.get(pubkey) as string;
  }

  if (DEFAULT_MODULE_REGISTRY.has(pubkey)) {
    return DEFAULT_MODULE_REGISTRY.get(pubkey) as string;
  }

  return null;
}
