import { computed, ref, shallowRef, type ShallowRef } from "vue";
import { resolvePageState } from "@/lib/page_state";

export interface PageRequestOptions<T> {
  initialData: T;
  isEmpty?: (data: T) => boolean;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

export function usePageRequest<T>(
  request: () => Promise<T>,
  options: PageRequestOptions<T>,
) {
  const data = shallowRef(options.initialData) as ShallowRef<T>;
  const error = shallowRef<unknown>();
  const initialized = ref(false);
  const hasSucceeded = ref(false);
  const lastSuccessAt = ref<number | null>(null);
  const stale = ref(false);
  const pendingCount = ref(0);
  let latestRequest = 0;

  const loading = computed(() => pendingCount.value > 0);
  const initialLoading = computed(() => loading.value && !hasSucceeded.value);
  const refreshing = computed(() => loading.value && hasSucceeded.value);
  const empty = computed(() =>
    options.isEmpty
      ? options.isEmpty(data.value)
      : Array.isArray(data.value)
        ? data.value.length === 0
        : data.value == null,
  );
  const state = computed(() =>
    resolvePageState({
      initialized: initialized.value,
      loading: loading.value && !hasSucceeded.value,
      itemCount: empty.value ? 0 : 1,
      error: hasSucceeded.value ? undefined : error.value,
    }),
  );

  async function execute(): Promise<T | undefined> {
    const requestId = ++latestRequest;
    pendingCount.value += 1;
    error.value = undefined;
    try {
      const result = await request();
      if (requestId === latestRequest) {
        data.value = result;
        await options.onSuccess?.(result);
        if (requestId === latestRequest) {
          initialized.value = true;
          hasSucceeded.value = true;
          lastSuccessAt.value = Date.now();
          stale.value = false;
        }
      }
      return result;
    } catch (cause) {
      if (requestId === latestRequest) {
        error.value = cause;
        initialized.value = true;
        options.onError?.(cause);
      }
      return undefined;
    } finally {
      pendingCount.value -= 1;
    }
  }

  function clearError() {
    error.value = undefined;
  }

  function markStale() {
    if (hasSucceeded.value) stale.value = true;
  }

  return {
    data,
    error,
    initialized,
    hasSucceeded,
    lastSuccessAt,
    stale,
    loading,
    initialLoading,
    refreshing,
    empty,
    state,
    execute,
    refresh: execute,
    retry: execute,
    clearError,
    markStale,
  };
}
