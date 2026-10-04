import { defineStore } from "pinia";
import { ref } from "vue";
import { get_capabilities } from "@/api/sys";

export const useCapabilityStore = defineStore("capability", () => {
  const capabilities = ref(new Set<string>());
  const loaded = ref(false);
  const failed = ref(false);
  let generation = 0;
  let pending: Promise<void> | null = null;

  function LOAD(): Promise<void> {
    if (loaded.value) return Promise.resolve();
    if (pending) return pending;
    const current = generation;
    pending = (async () => {
      try {
        const list = await get_capabilities();
        if (current !== generation) return;
        capabilities.value = new Set(list);
        loaded.value = true;
        failed.value = false;
      } catch {
        if (current === generation) failed.value = true;
      } finally {
        if (current === generation) pending = null;
      }
    })();
    return pending;
  }

  function HAS(name: string): boolean {
    return loaded.value && capabilities.value.has(name);
  }

  async function REQUIRE(name: string) {
    await LOAD();
    if (!HAS(name)) throw new Error(`Backend capability unavailable: ${name}`);
  }

  function RESET() {
    generation++;
    pending = null;
    loaded.value = false;
    failed.value = false;
    capabilities.value = new Set();
  }

  window.addEventListener("landscape-session-cleared", RESET);
  return { capabilities, loaded, failed, LOAD, HAS, REQUIRE, RESET };
});
