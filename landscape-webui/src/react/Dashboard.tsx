import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Drawer,
  Link,
  ProgressBar,
  Separator,
  Skeleton,
  Tooltip,
} from "@heroui/react";
import type { LandscapeSystemInfo } from "@/lib/sys";
import { LandscapeStatus } from "@/lib/sys";
import type { NetDev } from "@/lib/dev";
import { DevStateType } from "@/lib/dev";
import { get_sysinfo, interval_fetch_info } from "@/api/sys";
import {
  get_dns_lightweight_summary,
  type DnsLightweightSummaryResponse,
} from "@/api/metric/dns";
import { get_iface_stats } from "@/api/metric";
import { ifaces } from "@/api/network";
import { getFlowDnsRules } from "@landscape-router/types/api/dns-rules/dns-rules";
import { get_flow_dst_ip_rules } from "@/api/dst_ip_rule";
import { useI18n } from "./i18n";

const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(2);
const bounded = (value: number) => Math.max(0, Math.min(100, value || 0));
const ratio = (used?: number, total?: number) =>
  total ? Number((((used || 0) / total) * 100).toFixed(1)) : null;
const severity = (value: number, warning: number, danger: number) =>
  value >= danger ? "danger" : value >= warning ? "warning" : "accent";
const uptimeText = (seconds: number) => {
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return `${days ? `${days}d ` : ""}${hours ? `${hours}h ` : ""}${minutes}m ${Math.floor(seconds % 60)}s`;
};
const rate = (bytes = 0) => {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytes,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

function UsageBar({
  label,
  value,
  tone = "accent",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <ProgressBar
      aria-label={label}
      className={`usage-progress tone-${tone}`}
      value={bounded(value)}
    >
      <div className="usage-heading">
        <span>{label}</span>
        <ProgressBar.Output>{value.toFixed(1)}%</ProgressBar.Output>
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className={`metric${tone ? ` metric-${tone}` : ""}`} title={hint}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function RulesDrawer({
  kind,
  onClose,
}: {
  kind?: "dns" | "ip";
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [rules, setRules] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!kind) return;
    setLoading(true);
    setFailed(false);
    const request =
      kind === "dns" ? getFlowDnsRules(0) : get_flow_dst_ip_rules(0);
    void request
      .then((value) => setRules(Array.isArray(value) ? value : []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [kind]);
  return (
    <Drawer isOpen={Boolean(kind)} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Backdrop>
        <Drawer.Content className="rules-drawer">
          <Drawer.Dialog>
            <Drawer.Header>
              <Drawer.Heading>
                {kind === "dns"
                  ? t("dns.rule_drawer.title_default")
                  : t("flow.wan_rule_drawer.title_default")}
              </Drawer.Heading>
              <Drawer.CloseTrigger aria-label={t("common.close")}>
                ×
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body>
              <Link href={kind === "dns" ? "/dns/redirect" : "/flow"}>
                {t("common.edit")}
              </Link>
              {loading ? (
                <Skeleton className="rules-skeleton" />
              ) : failed ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t("common.load_failed")}</Alert.Title>
                  </Alert.Content>
                </Alert>
              ) : rules.length === 0 ? (
                <p className="drawer-description">{t("common.no_data")}</p>
              ) : (
                <div className="rule-list">
                  {rules.map((item, index) => {
                    const rule = item as Record<string, unknown>;
                    return (
                      <Card key={String(rule.id ?? index)}>
                        <Card.Header>
                          <Card.Title>
                            {String(rule.name ?? rule.remark ?? `${index + 1}`)}
                          </Card.Title>
                          <Chip size="sm">
                            <Chip.Label>
                              {rule.enable === false
                                ? t("common.disabled")
                                : t("common.enabled")}
                            </Chip.Label>
                          </Chip>
                        </Card.Header>
                        <Card.Content>
                          <dl className="device-details">
                            <Metric
                              label="Flow"
                              value={String(rule.flow_id ?? 0)}
                            />
                            <Metric
                              label="Mark"
                              value={String(rule.mark ?? "-")}
                            />
                            <Metric
                              label={t("dns.rule_card.match_rules")}
                              value={
                                Array.isArray(rule.source) && rule.source.length
                                  ? rule.source.map(String).join(", ")
                                  : t("common.no_data")
                              }
                            />
                          </dl>
                        </Card.Content>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function DnsCard() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<DnsLightweightSummaryResponse>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [drawer, setDrawer] = useState<"dns" | "ip">();
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const end_time = Date.now();
      setSummary(
        await get_dns_lightweight_summary({
          start_time: end_time - 300000,
          end_time,
        }),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const cache = ratio(
    summary?.cache_hit_count,
    summary?.total_effective_queries,
  );
  const block = ratio(summary?.block_count, summary?.total_queries) ?? 0;
  const latencies = [
    ["avg", summary?.avg_duration_ms, "success"],
    ["p50", summary?.p50_duration_ms, "accent"],
    ["p95", summary?.p95_duration_ms, "warning"],
    ["p99", summary?.p99_duration_ms, "danger"],
    ["max", summary?.max_duration_ms, "accent"],
  ] as const;
  return (
    <>
      <Card className="overview-card dns-card">
        <Card.Header className="overview-card-header">
          <div className="card-title-row">
            <Card.Title>DNS</Card.Title>
            <span className="card-kicker">
              {t("metric.dns.dash.recent_5m")}
            </span>
          </div>
          <div className="card-actions">
            <Button
              aria-label={t("metric.dns.dash.refresh")}
              isIconOnly
              isPending={loading}
              onPress={() => void load()}
              size="sm"
              variant="ghost"
            >
              ↻
            </Button>
            <Button
              onPress={() => setDrawer("dns")}
              size="sm"
              variant="secondary"
            >
              {t("metric.dns.dash.rules")}
            </Button>
            <Button
              onPress={() => setDrawer("ip")}
              size="sm"
              variant="secondary"
            >
              {t("metric.dns.dash.ip_rules")}
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="overview-card-content">
          {loading && !summary ? (
            <Skeleton className="dns-skeleton" />
          ) : error && !summary ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t("common.load_failed")}</Alert.Title>
                <Button onPress={() => void load()} size="sm">
                  {t("common.retry")}
                </Button>
              </Alert.Content>
            </Alert>
          ) : (
            <>
              {error ? (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t("common.load_failed")}</Alert.Title>
                  </Alert.Content>
                </Alert>
              ) : null}
              <dl className="dns-primary">
                <Metric
                  label={t("metric.dns.dash.total_queries")}
                  value={summary?.total_queries ?? 0}
                  hint={`NX: ${summary?.nxdomain_count ?? 0} / Err: ${summary?.error_count ?? 0}`}
                />
                <Metric
                  label={t("metric.dns.dash.cache_hit_rate")}
                  value={
                    cache === null ? t("metric.dns.dash.no_data") : `${cache}%`
                  }
                  hint={`${t("metric.dns.dash.cache_hit_tip")} · v4: ${ratio(summary?.hit_count_v4, summary?.total_v4) ?? "-"}% / v6: ${ratio(summary?.hit_count_v6, summary?.total_v6) ?? "-"}%`}
                />
                <Metric
                  label={t("metric.dns.dash.block_rate")}
                  value={`${block}%`}
                />
              </dl>
              <Separator />
              <div className="latency-heading">
                {t("metric.dns.dash.query_latency")} (ms){" "}
                <button
                  aria-label={t("metric.dns.dash.latency_tip")}
                  className="help-button"
                  title={t("metric.dns.dash.latency_tip")}
                  type="button"
                >
                  ?
                </button>
              </div>
              <dl className="latency-grid">
                {latencies.map(([key, value, tone]) => (
                  <Metric
                    key={key}
                    label={t(`metric.dns.dash.${key}`)}
                    tone={tone}
                    value={(value ?? 0).toFixed(1)}
                  />
                ))}
              </dl>
            </>
          )}
        </Card.Content>
      </Card>
      <RulesDrawer kind={drawer} onClose={() => setDrawer(undefined)} />
    </>
  );
}

type IfaceStat = {
  ifindex: number;
  stats: { ingress_bps?: number; egress_bps?: number; active_conns?: number };
};
function Topology() {
  const { t } = useI18n();
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("iface_node_v1") || "{}");
    } catch {
      return {};
    }
  }, []);
  const [devices, setDevices] = useState<NetDev[]>([]),
    [stats, setStats] = useState<IfaceStat[]>([]);
  const [selected, setSelected] = useState<NetDev>(),
    [hideDown, setHideDown] = useState(Boolean(saved.hide_down_dev));
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [devs, metrics] = await Promise.allSettled([
      ifaces(),
      get_iface_stats(),
    ]);
    if (devs.status === "fulfilled" && Array.isArray(devs.value))
      setDevices(devs.value);
    else setError(true);
    if (metrics.status === "fulfilled" && Array.isArray(metrics.value))
      setStats(metrics.value);
    else setError(true);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(
      () =>
        void get_iface_stats()
          .then((value) => Array.isArray(value) && setStats(value))
          .catch(() => setError(true)),
      5000,
    );
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    localStorage.setItem(
      "iface_node_v1",
      JSON.stringify({ ...saved, hide_down_dev: hideDown, view_locked: true }),
    );
  }, [hideDown, saved]);
  const visible = useMemo(
    () =>
      devices.filter(
        (dev) =>
          dev.dev_type !== "Loopback" &&
          (!hideDown || dev.dev_status.t !== DevStateType.Down),
      ),
    [devices, hideDown],
  );
  const statMap = useMemo(
    () => new Map(stats.map((item) => [item.ifindex, item.stats])),
    [stats],
  );
  return (
    <section className="topology-section" aria-labelledby="topology-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">{t("common.topology_divider")}</span>
          <h2 id="topology-title">{t("common.topology_divider")}</h2>
        </div>
        <div className="card-actions">
          <Button onPress={() => void load()} size="sm" variant="secondary">
            ↻ {t("metric.dns.dash.refresh")}
          </Button>
          <Button
            aria-pressed={hideDown}
            onPress={() => setHideDown(!hideDown)}
            size="sm"
            variant="ghost"
          >
            {hideDown ? "◉" : "◎"}{" "}
            {t(hideDown ? "topology.show_down" : "topology.hide_down")}
          </Button>
        </div>
      </div>
      <Card className="topology-card">
        <Card.Content>
          {loading && !devices.length ? (
            <Skeleton className="topology-skeleton" />
          ) : error && !devices.length ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t("common.load_failed")}</Alert.Title>
                <Button onPress={() => void load()}>{t("common.retry")}</Button>
              </Alert.Content>
            </Alert>
          ) : !visible.length ? (
            <div className="topology-empty">{t("common.no_data")}</div>
          ) : (
            <>
              {error ? (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t("common.load_failed")}</Alert.Title>
                  </Alert.Content>
                </Alert>
              ) : null}
              <div className="topology-canvas">
                {visible.map((dev) => {
                  const metric = statMap.get(dev.index),
                    active = selected?.index === dev.index;
                  return (
                    <button
                      aria-pressed={active}
                      className={`topology-node zone-${String(dev.zone_type)}${active ? " is-selected" : ""}`}
                      key={dev.index}
                      onClick={() => setSelected(dev)}
                      type="button"
                    >
                      <span
                        className={`status-dot status-${dev.dev_status.t}`}
                      />
                      <span className="node-name">{dev.name}</span>
                      <Chip size="sm">
                        <Chip.Label>{String(dev.zone_type)}</Chip.Label>
                      </Chip>
                      <span className="node-kind">
                        {dev.dev_kind || dev.dev_type}
                      </span>
                      <span className="node-rates">
                        <b>↓ {rate(metric?.ingress_bps)}</b>
                        <b>↑ {rate(metric?.egress_bps)}</b>
                        <small>{metric?.active_conns ?? 0} conn</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card.Content>
      </Card>
      <Drawer
        isOpen={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(undefined)}
      >
        <Drawer.Backdrop>
          <Drawer.Content className="device-drawer">
            <Drawer.Dialog>
              <Drawer.Header>
                <Drawer.Heading>{selected?.name}</Drawer.Heading>
                <Drawer.CloseTrigger aria-label={t("common.close")}>
                  ×
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body>
                {selected ? (
                  <dl className="device-details">
                    <Metric label="Status" value={selected.dev_status.t} />
                    <Metric label="Zone" value={String(selected.zone_type)} />
                    <Metric
                      label="Type"
                      value={selected.dev_kind || selected.dev_type}
                    />
                    <Metric label="MAC" value={selected.mac || "N/A"} />
                    <Metric
                      label="Controller"
                      value={selected.controller_name || "N/A"}
                    />
                    <Metric
                      label="Carrier"
                      value={
                        selected.carrier
                          ? t("topology.panel.yes")
                          : t("topology.panel.no")
                      }
                    />
                    <Metric
                      label="Boot"
                      value={
                        selected.enable_in_boot
                          ? t("topology.panel.yes")
                          : t("topology.panel.no")
                      }
                    />
                  </dl>
                ) : null}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </section>
  );
}

export default function Dashboard() {
  const { t, language } = useI18n();
  const [system, setSystem] = useState<LandscapeSystemInfo>(),
    [status, setStatus] = useState(() => new LandscapeStatus());
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [info, runtime] = await Promise.allSettled([
      get_sysinfo(),
      interval_fetch_info(),
    ]);
    if (info.status === "fulfilled") setSystem(info.value);
    else setFailed(true);
    if (runtime.status === "fulfilled") setStatus(runtime.value);
    else setFailed(true);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    const statusTimer = setInterval(
        () =>
          void interval_fetch_info()
            .then(setStatus)
            .catch(() => setFailed(true)),
        5000,
      ),
      clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(statusTimer);
      clearInterval(clock);
    };
  }, [load]);
  if (loading && !system)
    return (
      <section
        aria-busy="true"
        aria-label={t("routes.dashboard")}
        className="dashboard-page"
      >
        <div className="overview-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="overview-skeleton" key={i} />
          ))}
        </div>
        <Skeleton className="topology-skeleton" />
      </section>
    );
  if (failed && !system && !status.cpus.length)
    return (
      <section className="dashboard-page">
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("common.load_failed")}</Alert.Title>
            <Button onPress={() => void load()} size="sm">
              {t("common.retry")}
            </Button>
          </Alert.Content>
        </Alert>
      </section>
    );
  const memory = ratio(status.mem.used_mem, status.mem.total_mem) ?? 0,
    swap = ratio(status.mem.used_swap, status.mem.total_swap) ?? 0;
  const uptime = system?.start_at
    ? Math.max(0, now / 1000 - system.start_at)
    : status.uptime;
  const mismatch = Boolean(
    system?.landscape_version && system.landscape_version !== __APP_VERSION__,
  );
  return (
    <section aria-labelledby="dashboard-title" className="dashboard-page">
      <h1 className="sr-only" id="dashboard-title">
        {t("routes.dashboard")}
      </h1>
      {failed ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t("common.load_failed")}</Alert.Title>
            <Button onPress={() => void load()} size="sm">
              {t("common.retry")}
            </Button>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="overview-grid">
        <Card className="overview-card system-card">
          <Card.Header className="overview-card-header">
            <Card.Title>{t("sysinfo.system")}</Card.Title>
            {system?.cpu_arch ? (
              <Chip size="sm">
                <Chip.Label>{system.cpu_arch}</Chip.Label>
              </Chip>
            ) : null}
          </Card.Header>
          <Card.Content className="overview-card-content">
            <dl className="system-details">
              <div className="system-host">
                <dt>{t("sysinfo.hostname")}</dt>
                <dd>{system?.host_name || "--"}</dd>
              </div>
              <Metric
                label={t("sysinfo.system")}
                value={`${system?.system_name || "--"} · ${system?.kernel_version || "--"}`}
              />
              <Metric
                label={t("sysinfo.landscape_router")}
                value={
                  <span>
                    {system?.landscape_version || "--"}
                    {mismatch ? (
                      <Chip
                        color="danger"
                        size="sm"
                        title={`${t("sysinfo.backend")}: ${system?.landscape_version} · ${t("sysinfo.frontend")}: ${__APP_VERSION__}. ${t("sysinfo.check_browser_cache")}`}
                      >
                        <Chip.Label>{t("sysinfo.version_mismatch")}</Chip.Label>
                      </Chip>
                    ) : null}
                  </span>
                }
              />
              <Metric
                label={t("sysinfo.uptime")}
                value={<span className="tabular">{uptimeText(uptime)}</span>}
                hint={`${t("sysinfo.started_at")}: ${system?.start_at ? new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "medium" }).format(system.start_at * 1000) : "--"}`}
              />
            </dl>
          </Card.Content>
        </Card>
        <Card className="overview-card cpu-card">
          <Card.Header className="overview-card-header">
            <Card.Title>CPU</Card.Title>
            <Chip size="sm">
              <Chip.Label>
                {status.cpus.length} {t("sysinfo.cores")}
              </Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Content className="overview-card-content">
            <p className="cpu-model">
              {status.cpus[0]?.brand || t("common.no_data")}
            </p>
            <UsageBar
              label={t("sysinfo.total_cpu_usage")}
              tone={severity(status.global_cpu_info, 50, 80)}
              value={status.global_cpu_info}
            />
            <div className="cpu-summary">
              <Metric
                label={t("sysinfo.cpu_temp")}
                tone={severity(status.global_cpu_temp || 0, 60, 80)}
                value={
                  status.global_cpu_temp == null
                    ? t("sysinfo.no_sensor")
                    : `${status.global_cpu_temp.toFixed(1)}°C`
                }
              />
              <Metric
                label={t("sysinfo.average_load")}
                value={`${status.load_avg.one} / ${status.load_avg.five} / ${status.load_avg.fifteen}`}
              />
            </div>
            <div aria-label={t("sysinfo.cores")} className="cpu-cores">
              {status.cpus.map((cpu) => (
                <Tooltip key={cpu.name}>
                  <Tooltip.Trigger>
                    <button
                      aria-label={`${cpu.name} ${cpu.usage.toFixed(1)}%`}
                      className={`cpu-core tone-${severity(cpu.usage, 50, 80)}`}
                      type="button"
                    >
                      <span
                        style={{
                          height: `${Math.max(4, bounded(cpu.usage))}%`,
                        }}
                      />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {cpu.name} · {cpu.usage.toFixed(1)}% ·{" "}
                    {cpu.temperature == null
                      ? t("sysinfo.no_sensor")
                      : `${cpu.temperature.toFixed(1)}°C`}{" "}
                    · {cpu.frequency} MHz
                  </Tooltip.Content>
                </Tooltip>
              ))}
            </div>
          </Card.Content>
        </Card>
        <Card className="overview-card memory-card">
          <Card.Header className="overview-card-header">
            <Card.Title>{t("sysinfo.mem")}</Card.Title>
            <Chip size="sm">
              <Chip.Label>{gb(status.mem.total_mem)} GB</Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Content className="overview-card-content memory-content">
            <UsageBar
              label={t("sysinfo.memory_usage")}
              tone={severity(memory, 70, 90)}
              value={memory}
            />
            <p>
              {t("sysinfo.used")}: {gb(status.mem.used_mem)} GB ·{" "}
              {t("sysinfo.total")}: {gb(status.mem.total_mem)} GB
            </p>
            <div className="swap-heading">
              <span>{t("sysinfo.swap_usage")}</span>
              {!status.mem.total_swap ? (
                <Chip size="sm">
                  <Chip.Label>{t("sysinfo.disabled")}</Chip.Label>
                </Chip>
              ) : null}
            </div>
            <UsageBar
              label={t("sysinfo.swap_usage")}
              tone={severity(swap, 70, 90)}
              value={swap}
            />
            <p>
              {status.mem.total_swap
                ? `${t("sysinfo.used")}: ${gb(status.mem.used_swap)} GB · ${t("sysinfo.total")}: ${gb(status.mem.total_swap)} GB`
                : "--"}
            </p>
          </Card.Content>
        </Card>
        <DnsCard />
      </div>
      <Topology />
    </section>
  );
}
