export type DisplayFlowTarget = {
  t: string;
  container_name?: string;
  name?: string;
};

export function flowTargetName(target: DisplayFlowTarget) {
  return target.t === "netns"
    ? (target.container_name ?? "")
    : (target.name ?? "");
}
