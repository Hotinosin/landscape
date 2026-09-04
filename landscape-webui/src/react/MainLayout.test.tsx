import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axios from "axios";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LANDSCAPE_TOKEN_KEY, saveLandscapeSession } from "@/lib/session";
import { LANGUAGE_STORAGE_KEY } from "./i18n";
import {
  ACCENT_STORAGE_KEY,
  BASE_STORAGE_KEY,
  FONT_STORAGE_KEY,
  FORM_RADIUS_STORAGE_KEY,
  RADIUS_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "./theme";
import App from "./App";

let root: Root | undefined;

async function renderAt(path: string, authenticated = true) {
  if (authenticated) saveLandscapeSession("test-token", "admin");
  history.replaceState(null, "", path);
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

async function click(element: Element | null) {
  await act(async () => {
    (element as HTMLElement).click();
    await Promise.resolve();
  });
}

async function change(select: HTMLSelectElement, value: string) {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function changeInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  Object.defineProperty(navigator, "language", {
    configurable: true,
    value: "en-US",
  });
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  setAxiosInstance(
    axios.create({
      adapter: async (config) => ({
        config,
        data: { language: "en" },
        headers: {},
        status: 200,
        statusText: "OK",
      }),
    }),
  );
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
});

describe("React MainLayout", () => {
  it("protects the layout and renders its Outlet after authentication", async () => {
    await renderAt("/flow", false);
    expect(location.pathname).toBe("/login");
    await act(async () => root?.unmount());
    document.body.replaceChildren();
    root = undefined;

    await renderAt("/flow");
    expect(document.querySelector("aside")).toBeTruthy();
    expect(document.body.textContent).toContain("Traffic Policies");
    expect(document.body.textContent).toContain(
      "waiting for its React page migration",
    );
  });

  it("highlights nested routes and keeps their parent expanded", async () => {
    localStorage.setItem(
      "front_end",
      JSON.stringify({ sidebar_collapsed: false }),
    );
    await renderAt("/metrics/conn/history-src");
    const history = document.querySelector('a[href="/metrics/conn/history"]');
    expect(history?.getAttribute("aria-current")).toBe("page");
    expect(history?.className).toContain("nav-link--active");
    const group = [...document.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Monitoring & Analytics"),
    );
    expect(group?.getAttribute("aria-expanded")).toBe("true");
  });

  it("navigates with links and renders the shared pending state", async () => {
    localStorage.setItem(
      "front_end",
      JSON.stringify({ sidebar_collapsed: false }),
    );
    await renderAt("/");
    const link = document.querySelector<HTMLAnchorElement>(
      'a[href="/dns/upstream"]',
    )!;
    link.focus();
    expect(document.activeElement).toBe(link);
    await click(link);
    expect(location.pathname).toBe("/dns/upstream");
    expect(document.body.textContent).toContain("Upstream DNS Settings");
    expect(document.body.textContent).not.toContain(
      "waiting for its React page migration",
    );
  });

  it("persists the desktop sidebar collapse preference", async () => {
    localStorage.setItem(
      "front_end",
      JSON.stringify({ sidebar_collapsed: false, keep: 1 }),
    );
    await renderAt("/");
    await click(
      document.querySelector('button[aria-label="Collapse sidebar"]'),
    );
    expect(JSON.parse(localStorage.getItem("front_end")!)).toEqual({
      sidebar_collapsed: true,
      username: "admin",
      keep: 1,
    });
    expect(document.querySelector(".app-layout")?.className).toContain(
      "app-layout--collapsed",
    );
  });

  it("opens the mobile Drawer, navigates, and closes it", async () => {
    await renderAt("/");
    await click(document.querySelector('[aria-label="Open navigation"]'));
    expect(document.querySelector('[role="dialog"]')).toBeTruthy();
    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[href="/flow"]'),
    ];
    await click(links[links.length - 1]);
    expect(location.pathname).toBe("/flow");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("updates and persists all theme settings and language", async () => {
    await renderAt("/");
    await change(document.querySelector('select[aria-label="Theme"]')!, "dark");
    await change(
      document.querySelector('select[aria-label="Radius"]')!,
      "large",
    );
    await change(
      document.querySelector('select[aria-label="Radius Form"]')!,
      "small",
    );
    await change(
      document.querySelector('select[aria-label="Font Family"]')!,
      "mono",
    );
    await changeInput(
      document.querySelector('input[aria-label="Accent"]')!,
      "320",
    );
    await changeInput(
      document.querySelector('input[aria-label="Base"]')!,
      "0.02",
    );
    await change(
      document.querySelector('select[aria-label="Language"]')!,
      "zh",
    );
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toMatchObject({
      preference: "dark",
    });
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe("320");
    expect(localStorage.getItem(BASE_STORAGE_KEY)).toBe("0.02");
    expect(localStorage.getItem(FONT_STORAGE_KEY)).toBe("mono");
    expect(localStorage.getItem(RADIUS_STORAGE_KEY)).toBe("large");
    expect(localStorage.getItem(FORM_RADIUS_STORAGE_KEY)).toBe("small");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.radius).toBe("large");
    expect(document.documentElement.dataset.formRadius).toBe("small");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(
      "oklch(57.74% 0.2091 320)",
    );
    expect(document.body.textContent).toContain("系统概览");
  });

  it("logs out without clearing visual or language preferences", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    localStorage.setItem(RADIUS_STORAGE_KEY, "large");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh");
    await renderAt("/");
    await change(
      document.querySelector('select[aria-label="Language"]')!,
      "zh",
    );
    await click(document.querySelector(".preference-controls > button"));
    expect(location.pathname).toBe("/login");
    expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(RADIUS_STORAGE_KEY)).toBe("large");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh");
    expect(JSON.parse(localStorage.getItem("front_end")!).username).toBe("");
  });
});
