import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, disposePinia, setActivePinia } from "pinia";
import { Terminal } from "@xterm/xterm";
import { usePtyStore } from "./pty";
import { clearLandscapeSession, LANDSCAPE_TOKEN_KEY } from "@/lib/common";

vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn(function () {
    return {
      loadAddon: vi.fn(),
      dispose: vi.fn(),
      reset: vi.fn(),
      write: vi.fn(),
      onData: vi.fn(),
      onResize: vi.fn(),
      focus: vi.fn(),
    };
  }),
}));
vi.mock("@xterm/addon-serialize", () => ({
  SerializeAddon: vi.fn(function () {
    return { serialize: () => "terminal history" };
  }),
}));

class SocketStub {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances: SocketStub[] = [];
  readyState = SocketStub.CONNECTING;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  onerror?: () => void;
  close = vi.fn();
  send = vi.fn();
  constructor(public url: string) {
    SocketStub.instances.push(this);
  }
}

let pinia: ReturnType<typeof createPinia>;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  localStorage.clear();
  localStorage.setItem(LANDSCAPE_TOKEN_KEY, "session");
  SocketStub.instances = [];
  vi.clearAllMocks();
  vi.stubGlobal("WebSocket", SocketStub);
  vi.useFakeTimers();
});
afterEach(() => {
  disposePinia(pinia);
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PTY session lifecycle", () => {
  it("clears the connection and terminal history on session logout", async () => {
    const store = usePtyStore();
    await store.connect();
    const socket = SocketStub.instances[0];
    socket.readyState = SocketStub.OPEN;
    socket.onopen?.();
    const terminal = new Terminal();
    store.attachTerminal(terminal, { fit: vi.fn() } as any);
    store.isOpen = true;
    expect(store.isConnected).toBe(true);

    clearLandscapeSession();
    expect(socket.close).toHaveBeenCalledOnce();
    expect(terminal.reset).toHaveBeenCalledOnce();
    expect(store.isConnected).toBe(false);
    expect(store.isOpen).toBe(false);
    const master = vi.mocked(Terminal).mock.results[0].value;
    expect(master.dispose).toHaveBeenCalledOnce();
    socket.onmessage?.({ data: JSON.stringify({ t: "data", data: [65] }) });
    expect(master.write).not.toHaveBeenCalled();
    vi.mocked(terminal.write).mockClear();
    store.attachTerminal(terminal, { fit: vi.fn() } as any);
    expect(terminal.write).not.toHaveBeenCalled();
    await store.connect();
    expect(SocketStub.instances).toHaveLength(1);
  });

  it("invalidates initialization pending at logout", async () => {
    const store = usePtyStore();
    const pending = store.connect();
    clearLandscapeSession();
    await pending;
    expect(SocketStub.instances).toHaveLength(0);
    expect(Terminal).not.toHaveBeenCalled();
  });

  it("deduplicates pending connections and ignores events from replaced sockets", async () => {
    const store = usePtyStore();
    await Promise.all([store.connect(), store.connect()]);
    await store.connect();
    expect(SocketStub.instances).toHaveLength(1);
    const old = SocketStub.instances[0];
    store.disconnect();
    await store.connect();
    const current = SocketStub.instances[1];
    current.readyState = SocketStub.OPEN;
    current.onopen?.();
    old.onclose?.();
    expect(store.isConnected).toBe(true);
    store.disconnect();
    expect(current.close).toHaveBeenCalledOnce();
  });
});
