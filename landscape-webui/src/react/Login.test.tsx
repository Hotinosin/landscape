import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axios from "axios";
import { toast } from "@heroui/react";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/session";

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));
vi.mock("@/api/auth", () => ({ do_login: loginMock }));

import App from "./App";

let root: Root | undefined;

async function renderAt(path: string, state: unknown = null) {
  history.replaceState(state, "", path);
  const container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

function credentials(username = "admin", password = "correct-password") {
  const usernameInput = document.querySelector<HTMLInputElement>(
    'input[name="username"]',
  )!;
  const passwordInput = document.querySelector<HTMLInputElement>(
    'input[name="password"]',
  )!;
  usernameInput.value = username;
  passwordInput.value = password;
}

async function submit() {
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(
        new SubmitEvent("submit", { bubbles: true, cancelable: true }),
      );
    await Promise.resolve();
  });
}

beforeEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
  document.cookie =
    "LANDSCAPE_PLUGIN_TOKEN=; Path=/api/plugins; Max-Age=0; SameSite=Strict";
  toast.clear();
  loginMock.mockReset();
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
        data: { data: {} },
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
  vi.restoreAllMocks();
});

describe("React Login", () => {
  it("redirects a protected query/hash URL and renders the English form", async () => {
    await renderAt("/dns/upstream?source=test#details");
    expect(location.pathname).toBe("/login");
    expect(
      document.querySelector('input[autocomplete="username"]'),
    ).toBeTruthy();
    expect(
      document.querySelector(
        'input[type="password"][autocomplete="current-password"]',
      ),
    ).toBeTruthy();
    expect(document.body.textContent).toContain("Username");
    expect(document.body.textContent).toContain("Password");
  });

  it("renders the existing Chinese translations", async () => {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "zh-CN",
    });
    await renderAt("/login");
    expect(document.body.textContent).toContain("用户名");
    expect(document.body.textContent).toContain("密码");
    expect(document.body.textContent).toContain("登录");
  });

  it("blocks duplicate submissions while the request is pending", async () => {
    let finish!: (value: { success: boolean; token: string }) => void;
    loginMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await renderAt("/login");
    credentials();
    await submit();
    await submit();
    expect(loginMock).toHaveBeenCalledTimes(1);
    const submitButton = document.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    expect(submitButton?.disabled).toBe(true);
    expect(submitButton?.querySelector(".login-spinner")).toBeTruthy();
    await act(async () => finish({ success: true, token: "token" }));
  });

  it("shows a translated failure without saving credentials", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    loginMock.mockRejectedValue({
      error_id: "auth.invalid_credentials",
      message: "internal-sensitive-detail",
      status: 401,
    });
    await renderAt("/login");
    credentials("admin", "super-secret-password");
    await submit();
    expect(document.body.textContent).toContain("Invalid username or password");
    expect(document.body.textContent).not.toContain(
      "internal-sensitive-detail",
    );
    expect(document.body.textContent).not.toContain("super-secret-password");
    expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("saves the session cookie and returns to the full protected URL", async () => {
    const cookieSetter = vi.spyOn(document, "cookie", "set");
    loginMock.mockResolvedValue({ success: true, token: "access-token" });
    await renderAt("/dns/upstream?source=test#details");
    credentials();
    await submit();
    expect(localStorage.getItem(LANDSCAPE_TOKEN_KEY)).toBe("access-token");
    expect(cookieSetter).toHaveBeenCalledWith(
      expect.stringContaining("LANDSCAPE_PLUGIN_TOKEN=access-token"),
    );
    expect(`${location.pathname}${location.search}${location.hash}`).toBe(
      "/dns/upstream?source=test#details",
    );
    expect(history.state.usr).toBeNull();
  });

  it("uses home when no return address exists", async () => {
    loginMock.mockResolvedValue({ success: true, token: "access-token" });
    await renderAt("/login");
    credentials();
    await submit();
    expect(location.pathname).toBe("/");
  });

  it("redirects an authenticated visitor away from login", async () => {
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, "existing-token");
    await renderAt("/login", { usr: { redirect: "/flow?from=login#info" } });
    expect(`${location.pathname}${location.search}${location.hash}`).toBe(
      "/flow?from=login#info",
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("never renders or logs password, token, or cookie values", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    loginMock.mockRejectedValue({ message: "backend failure", status: 500 });
    await renderAt("/login");
    credentials("admin", "password-must-stay-private");
    await submit();
    const visible = document.body.textContent ?? "";
    expect(visible).not.toContain("password-must-stay-private");
    expect(visible).not.toContain("LANDSCAPE_PLUGIN_TOKEN");
    expect(visible).not.toContain("access-token");
    expect([
      ...log.mock.calls,
      ...warn.mock.calls,
      ...error.mock.calls,
    ]).toEqual([]);
  });
});
