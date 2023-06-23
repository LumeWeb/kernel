// This variable is the key that got loaded into memory by the bootloader, and
// is the user key. We keep this key in memory, because if the user ever logs
// out the kernel is expected to refresh, which will clear the key.
declare let userKey: Uint8Array;

export const activeKey = userKey;
