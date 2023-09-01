const DEFAULT_MODULE_REGISTRY = new Map<string, string>(Object.entries({}));
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
