const DEFAULT_MODULE_REGISTRY = new Map<string, string>(
  Object.entries({
    // swarm
    zrjTDyEX8Mh2PdDdRj5YL2byFGrYe1ksczRwPaTRFaCGSMG:
      "z2H78pADGKWPz2zWEgGKDc7jYYtSv6qBfDtKzU4Tq5zgFoejmiQD",
    // peerDiscoveryRegistry
    zrjD6CEchDtSex5VHjzMNSAdkJpMNfCtbxSnftgtfvtnsdY:
      "z2H7AhnortTD6wL53XUdTotJZLADa7PbZCcHuSFJ6WgZ6td2bvaC",
    // ircPeerDiscovery
    zrjHTx8tSQFWnmZ9JzK7XmJirqJQi2WRBLYp3fASaL2AfBQ:
      "z2H7D35inXTkjuxevunyq7ojv1iomXJD1svDYgkLnknk2bXc14HC",
    // s5
    zrjLjKVByzt233rfcjWvTQXrMfGFa11oBLydPaUk7gwnC2d:
      "z2H6yA5VLuVUukioBiSNYTBEMGBXHgV2uxcfppUnsSidZTwZHiWE",
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
