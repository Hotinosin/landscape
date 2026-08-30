export type DisplayFlowTarget = {
  t: string;
  container_name?: string;
  name?: string;
};

export function isPluginTarget(target: DisplayFlowTarget) {
  return target.t === "netns" && target.container_name?.startsWith("plugin:");
}

export function flowTargetName(target: DisplayFlowTarget) {
  return target.t === "netns"
    ? target.container_name?.replace(/^plugin:/, "") ?? ""
    : target.name ?? "";
}
