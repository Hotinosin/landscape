
export function generateValidMAC() {
  let mac = [...Array(6)].map(() =>
    ("0" + Math.floor(Math.random() * 256).toString(16)).slice(-2),
  );
  mac[0] = (
    "0" + ((parseInt(mac[0], 16) & 0b11111110) | 0b00000010).toString(16)
  ).slice(-2);
  return mac.join(":");
}

export function formatMacAddress(mac: string): string {
  return mac.replace(/-/g, ":");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatRate(bps: number): string {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(2)} Kbps`;
  if (bps < 1000000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
  return `${(bps / 1000000000).toFixed(2)} Gbps`;
}

export function formatPackets(pps: number): string {
  if (pps < 1000) return `${pps} pps`;
  return `${(pps / 1000).toFixed(2)} Kpps`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)} K`;
  return `${(count / 1000000).toFixed(1)} M`;
}
