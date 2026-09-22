import { MessageApi } from "naive-ui";
import i18n from "@/i18n";

export class Range {
  start: number;
  end: number;

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }
}

export type KeyValuePair = { key: string; value: string };

export class SimpleResult {
  success: boolean;

  constructor(obj?: { success?: boolean }) {
    this.success = obj?.success ?? false;
  }
}

export const LANDSCAPE_TOKEN_KEY = "LANDSCAPE_TOKEN";

export const LANDSCAPE_SESSION_CLEARED = "landscape-session-cleared";
export let landscapeSessionGeneration = 0;

export function clearLandscapeSession() {
  landscapeSessionGeneration += 1;
  localStorage.removeItem(LANDSCAPE_TOKEN_KEY);
  document.cookie =
    "LANDSCAPE_PLUGIN_TOKEN=; Path=/api/plugins; Max-Age=0; SameSite=Strict";
  window.dispatchEvent(new Event(LANDSCAPE_SESSION_CLEARED));
}

export function syncPluginSessionCookie() {
  const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
  if (token)
    document.cookie = `LANDSCAPE_PLUGIN_TOKEN=${token}; Path=/api/plugins; SameSite=Strict`;
}

export async function copy_context_to_clipboard(
  message: MessageApi,
  content: string,
) {
  try {
    await navigator.clipboard.writeText(content);
    message.success(i18n.global.t("common.copy_success"));
  } catch (e) {
    message.error(i18n.global.t("common.copy_failed"));
  }
}

export async function read_context_from_clipboard(): Promise<string> {
  return await navigator.clipboard.readText();
}

/**
 * 检测是否为 IPv4 地址
 */
export function is_ipv4(value: string): boolean {
  return /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/.test(
    value,
  );
}

/**
 * 检测是否为 IPv6 地址
 */
export function is_ipv6(value: string): boolean {
  return /^(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}$|::/.test(value);
}

export function expand_ipv6(value: string): string | null {
  const normalized = value.trim().toLowerCase().split("%")[0];
  if (!normalized || !normalized.includes(":")) return null;
  if (!/^[0-9a-f:]+$/.test(normalized)) return null;

  const segments = normalized.split("::");
  if (segments.length > 2) return null;

  const hasCompression = segments.length === 2;
  const head = segments[0] ? segments[0].split(":") : [];
  const tail = hasCompression && segments[1] ? segments[1].split(":") : [];
  const isValidHextet = (part: string) => /^[0-9a-f]{1,4}$/.test(part);
  if (!head.every(isValidHextet) || !tail.every(isValidHextet)) return null;

  const missingCount = 8 - head.length - tail.length;
  if (hasCompression) {
    if (missingCount < 1) return null;
  } else if (missingCount !== 0) {
    return null;
  }

  const full = hasCompression
    ? [...head, ...Array.from({ length: missingCount }, () => "0"), ...tail]
    : head;
  if (full.length !== 8) return null;
  return full.map((part) => part.padStart(4, "0")).join(":");
}

export function ipv6_iid_has_wan_marker(value: string): boolean {
  const expanded = expand_ipv6(value);
  if (!expanded) return false;
  const firstIidHextet = Number.parseInt(expanded.split(":")[4], 16);
  return (firstIidHextet & 0x8000) !== 0;
}

/**
 * 检测是否为 MAC 地址
 */
export function is_mac(value: string): boolean {
  return /^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$/.test(value);
}

/**
 * IPv4 打码：全部隐藏
 * 192.168.1.123 -> ***.***.***.***
 */
export function mask_ipv4(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [ip, prefix] = trimmed.split("/");
    if (is_ipv4(ip)) return `***.***.***.***/${prefix}`;
  }
  return "***.***.***.***";
}

/**
 * IPv6 打码：全部隐藏
 */
export function mask_ipv6(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [ip, prefix] = trimmed.split("/");
    if (is_ipv6(ip)) return `${mask_ipv6(ip)}/${prefix}`;
  }
  if (trimmed.includes("::")) {
    return "****::****";
  }
  const parts = trimmed.split(":");
  if (parts.length < 3) return "******";
  return parts.map(() => "****").join(":");
}

/**
 * MAC 打码：全部隐藏
 * AA:BB:CC:DD:EE:FF -> **:**:**:**:**:**
 */
export function mask_mac(value: string): string {
  const separator = value.includes(":") ? ":" : "-";
  const parts = value.trim().split(separator);
  if (parts.length !== 6) return "**:**:**:**:**:**";
  return parts.map(() => "**").join(separator);
}

export function mask_string(value: string | undefined | null): string {
  if (!value) return "***";

  const trimmed = value.trim();
  if (!trimmed) return "***";

  if (is_mac(trimmed)) return mask_mac(trimmed);
  if (is_ipv4(trimmed)) return mask_ipv4(trimmed);
  if (is_ipv6(trimmed)) return mask_ipv6(trimmed);

  // CIDR 地址
  if (trimmed.includes("/")) {
    const slashIdx = trimmed.indexOf("/");
    const ip = trimmed.slice(0, slashIdx);
    const prefix = trimmed.slice(slashIdx + 1);
    if (is_ipv4(ip)) return `${mask_ipv4(ip)}/${prefix}`;
    if (is_ipv6(ip)) return `${mask_ipv6(ip)}/${prefix}`;
  }

  // IP:端口
  if (trimmed.includes(":")) {
    const lastColon = trimmed.lastIndexOf(":");
    const host = trimmed.slice(0, lastColon);
    const port = trimmed.slice(lastColon + 1);
    if (/^\d+$/.test(port)) {
      if (is_ipv4(host)) return `${mask_ipv4(host)}:****`;
      if (
        host.startsWith("[") &&
        host.endsWith("]") &&
        is_ipv6(host.slice(1, -1))
      ) {
        return `[${mask_ipv6(host.slice(1, -1))}]:****`;
      }
    }
  }

  return "******";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
