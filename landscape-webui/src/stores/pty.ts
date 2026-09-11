import { defineStore } from "pinia";
import { ref, shallowRef, watch, onScopeDispose } from "vue";
import type { Terminal } from "@xterm/xterm";
import type { SerializeAddon } from "@xterm/addon-serialize";
import type { FitAddon } from "@xterm/addon-fit";
import { LANDSCAPE_TOKEN_KEY, LANDSCAPE_SESSION_CLEARED } from "@/lib/common";
import type {
  LandscapePtyConfig,
  PtyOutMessage,
} from "@landscape-router/types/api/schemas";

export const usePtyStore = defineStore("pty", () => {
  // The "Master" terminal holds the state but never renders to DOM
  const masterTerminal = shallowRef<Terminal | null>(null);
  const masterSerializeAddon = shallowRef<SerializeAddon | null>(null);
  const decoder = new TextDecoder("utf-8"); // Decoder for incoming UTF-8 bytes

  // The "Active" terminal is the one currently visible (if any)
  const activeTerminal = shallowRef<Terminal | null>(null);
  const activeFitAddon = shallowRef<FitAddon | null>(null);

  const socket = shallowRef<WebSocket | null>(null);
  const isConnected = ref(false);
  const keepAlive = ref(true);
  const hasUnread = ref(false);

  // UI State - Load from LocalStorage if available
  const isOpen = ref(false);

  const savedViewMode = localStorage.getItem("landscape-pty-view-mode");
  const viewMode = ref<"float" | "dock">(
    savedViewMode === "float" ? "float" : "dock",
  );

  // Smart initial dock position based on screen aspect ratio
  function getSmartDockPosition(): "bottom" | "right" {
    const savedPos = localStorage.getItem("landscape-pty-dock-position");
    if (savedPos === "right" || savedPos === "bottom") {
      return savedPos;
    }
    // First time: choose based on screen dimensions
    // Wide screens (landscape) → right dock; Tall screens (portrait) → bottom dock
    const aspectRatio = window.innerWidth / window.innerHeight;
    return aspectRatio > 1.4 ? "right" : "bottom";
  }

  const dockPosition = ref<"bottom" | "right">(getSmartDockPosition());

  const savedDockSize = localStorage.getItem("landscape-pty-dock-size");
  const dockSize = ref(savedDockSize ? parseInt(savedDockSize) : 400);

  // Persistence Watchers
  watch(viewMode, (val) =>
    localStorage.setItem("landscape-pty-view-mode", val),
  );
  watch(dockPosition, (val) =>
    localStorage.setItem("landscape-pty-dock-position", val),
  );
  watch(dockSize, (val) =>
    localStorage.setItem("landscape-pty-dock-size", val.toString()),
  );

  const config = ref<LandscapePtyConfig>({
    shell: localStorage.getItem("landscape-pty-shell") || "/bin/bash",
    rows: 0,
    cols: 0,
    pixel_width: 0,
    pixel_height: 0,
  });
  watch(
    () => config.value.shell,
    (shell) => localStorage.setItem("landscape-pty-shell", shell),
  );

  function objToQuery(obj: any) {
    const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY) ?? "";
    const query = Object.entries(obj)
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    return query
      ? `${query}&token=${encodeURIComponent(token)}`
      : `token=${encodeURIComponent(token)}`;
  }

  let connectionAttempt = 0;
  let connecting = false;

  async function initMasterTerminal(attempt: number) {
    if (masterTerminal.value) return;

    const [{ Terminal }, { SerializeAddon }] = await Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-serialize"),
    ]);

    if (attempt !== connectionAttempt) return;

    // Headless terminal to keep state
    const term = new Terminal({
      cols: 129,
      rows: 33,
      allowProposedApi: true,
      scrollback: 5000, // Keep plenty of history
    });

    const serialize = new SerializeAddon();
    term.loadAddon(serialize);

    masterTerminal.value = term;
    masterSerializeAddon.value = serialize;
  }

  // Register a UI terminal to receive updates and sync state
  function attachTerminal(term: Terminal, fit: FitAddon) {
    activeTerminal.value = term;
    activeFitAddon.value = fit;
    hasUnread.value = false;

    // 1. Sync state from master
    if (masterSerializeAddon.value) {
      const history = masterSerializeAddon.value.serialize();
      term.write(history);
    }

    // 2. Setup input forwarding
    term.onData((data) => {
      if (socket.value && socket.value.readyState === WebSocket.OPEN) {
        socket.value.send(
          JSON.stringify({
            t: "data",
            data: Array.from(new TextEncoder().encode(data)),
          }),
        );
      }
    });

    // 3. Setup resize forwarding
    term.onResize((size) => {
      // Update master size too
      masterTerminal.value?.resize(size.cols, size.rows);

      if (!socket.value || socket.value.readyState !== WebSocket.OPEN) return;
      socket.value.send(
        JSON.stringify({
          t: "size",
          size: { ...size, pixel_width: 0, pixel_height: 0 },
        }),
      );
    });

    // Initial fit
    setTimeout(() => {
      if (activeTerminal.value !== term) return;
      fit.fit();
      term.focus();
    }, 50);
  }

  function detachTerminal(term: Terminal) {
    if (activeTerminal.value === term) {
      activeTerminal.value = null;
      activeFitAddon.value = null;
    }
  }

  async function connect() {
    if (
      connecting ||
      !localStorage.getItem(LANDSCAPE_TOKEN_KEY) ||
      isConnected.value ||
      (socket.value && socket.value.readyState <= WebSocket.OPEN)
    )
      return;

    const attempt = ++connectionAttempt;
    connecting = true;
    try {
      await initMasterTerminal(attempt);
    } finally {
      if (attempt === connectionAttempt) connecting = false;
    }
    if (attempt !== connectionAttempt) return;

    const url = `wss://${window.location.hostname}:${window.location.port}/api/ws/pty/sessions?${objToQuery(config.value)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (socket.value !== ws) return;
      isConnected.value = true;
      // Prevent accidental page refresh
      window.addEventListener("beforeunload", preventUnload);
    };

    ws.onmessage = (event) => {
      if (socket.value !== ws) return;
      try {
        const msg = JSON.parse(event.data) as PtyOutMessage;
        if (msg.t === "data") {
          const text = decoder.decode(new Uint8Array(msg.data), {
            stream: true,
          });

          // Write to Master (State)
          masterTerminal.value?.write(text);

          // Write to Active UI (View)
          if (activeTerminal.value) {
            activeTerminal.value.write(text);
          } else {
            // No active terminal means user isn't watching
            hasUnread.value = true;
          }
        } else if (msg.t === "exit") {
          const exitMsg = `\r\n[Process exited with code ${msg.msg}]\r\n`;
          masterTerminal.value?.write(exitMsg);
          activeTerminal.value?.write(exitMsg);
        }
      } catch (e) {
        console.error("Failed to parse PTY message", e);
      }
    };

    ws.onclose = () => {
      if (socket.value !== ws) return;
      isConnected.value = false;
      socket.value = null;
      window.removeEventListener("beforeunload", preventUnload);
    };

    ws.onerror = () => {
      if (socket.value !== ws) return;
      isConnected.value = false;
    };

    socket.value = ws;
  }

  function disconnect() {
    connectionAttempt += 1;
    connecting = false;
    const ws = socket.value;
    socket.value = null;
    ws?.close();
    isConnected.value = false;
    window.removeEventListener("beforeunload", preventUnload);
  }

  function clearSession() {
    disconnect();
    masterTerminal.value?.dispose();
    masterTerminal.value = null;
    masterSerializeAddon.value = null;
    activeTerminal.value?.reset();
    activeTerminal.value = null;
    activeFitAddon.value = null;
    decoder.decode();
    hasUnread.value = false;
    isOpen.value = false;
  }

  window.addEventListener(LANDSCAPE_SESSION_CLEARED, clearSession);
  onScopeDispose(() => {
    window.removeEventListener(LANDSCAPE_SESSION_CLEARED, clearSession);
    clearSession();
  });

  function preventUnload(e: BeforeUnloadEvent) {
    if (isConnected.value && keepAlive.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  function fit() {
    activeFitAddon.value?.fit();
  }

  function markRead() {
    hasUnread.value = false;
  }

  function toggleOpen() {
    isOpen.value = !isOpen.value;
  }

  // Refactored Actions for cleaner logic separation
  function setViewMode(mode: "float" | "dock") {
    viewMode.value = mode;
  }

  function setDockPosition(pos: "bottom" | "right") {
    dockPosition.value = pos;
  }

  return {
    isConnected,
    keepAlive,
    hasUnread,
    config,
    // UI State
    isOpen,
    viewMode,
    dockPosition,
    dockSize,
    // Actions
    connect,
    disconnect,
    attachTerminal,
    detachTerminal,
    fit,
    markRead,
    toggleOpen,
    setViewMode,
    setDockPosition,
  };
});
