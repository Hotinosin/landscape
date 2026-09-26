export type PageState = "initial" | "loading" | "ready" | "empty" | "error";

export function resolvePageState(options: {
  initialized?: boolean;
  loading?: boolean;
  itemCount?: number;
  error?: unknown;
}): PageState {
  if (options.error) return "error";
  if (!options.initialized || options.loading)
    return options.initialized ? "loading" : "initial";
  return (options.itemCount ?? 0) > 0 ? "ready" : "empty";
}
