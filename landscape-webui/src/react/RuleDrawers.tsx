import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  Label,
  Modal,
  Skeleton,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { isIP } from "is-ip";
import type {
  DNSRuleConfig,
  CheckChainDnsResult,
  FlowMark,
  WanIPRuleSource,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";
import { getFlowRules } from "@landscape-router/types/api/flow-rules/flow-rules";
import { get_dns_upstreams } from "@/api/dns_rule/upstream";
import {
  check_domain,
  invalidate_domain_cache,
  refresh_domain_cache,
} from "@/api/dns_service";
import {
  delete_dns_rule,
  get_dns_rule,
  get_flow_dns_rules,
  push_dns_rule,
  push_many_dns_rule,
} from "@/api/dns_rule";
import {
  delete_dst_ip_rules_rule,
  get_dst_ip_rules_rule,
  get_flow_dst_ip_rules,
  push_dst_ip_rules_rule,
  push_many_dst_ip_rule,
  update_dst_ip_rules_rule,
} from "@/api/dst_ip_rule";
import { DnsRule } from "@/lib/dns";
import { WanIpRuleConfigClass } from "@/lib/mark";
import { MatchRulesEditor } from "./DnsPages";
import { useI18n } from "./i18n";

type Kind = "dns" | "ip";
type MarkAction = FlowMark["action"]["t"];

const markText = (
  mark: FlowMark,
  t: (key: string, args?: Record<string, unknown>) => string,
) => {
  const key =
    mark.action.t === "keep_going"
      ? "current_flow_egress"
      : mark.action.t === "direct"
        ? "default_flow_egress"
        : mark.action.t === "drop"
          ? "drop"
          : "flow_id_egress";
  return `${t(`flow.mark_exhibit.${key}`, { flow_id: mark.flow_id })}${mark.allow_reuse_port ? ` · ${t("flow.mark_exhibit.nat1")}` : ""}`;
};

function MarkEditor({
  mark,
  onChange,
}: {
  mark: FlowMark;
  onChange: (mark: FlowMark) => void;
}) {
  const { t } = useI18n();
  const [flows, setFlows] = useState<
    Array<{ flow_id: number; remark?: string | null }>
  >([]);
  useEffect(() => {
    void getFlowRules()
      .then((value) => setFlows(Array.isArray(value) ? value : []))
      .catch(() => undefined);
  }, []);
  const setAction = (action: MarkAction) =>
    onChange({
      action: { t: action },
      flow_id: action === "redirect" ? mark.flow_id : 0,
      allow_reuse_port:
        action === "keep_going" || action === "direct"
          ? mark.allow_reuse_port
          : false,
    });
  return (
    <div className="rule-mark-editor">
      <select
        aria-label={t("flow.mark_edit.select_match_type")}
        value={mark.action.t}
        onChange={(e) => setAction(e.target.value as MarkAction)}
      >
        <option value="keep_going">
          {t("flow.mark_edit.option_current_flow")}
        </option>
        <option value="direct">
          {t("flow.mark_edit.option_default_flow")}
        </option>
        <option value="drop">{t("flow.mark_edit.option_block")}</option>
        <option value="redirect">{t("flow.mark_edit.option_redirect")}</option>
      </select>
      {mark.action.t === "redirect" ? (
        <select
          aria-label={t("flow.mark_edit.flow_id_placeholder")}
          value={mark.flow_id}
          onChange={(e) =>
            onChange({ ...mark, flow_id: Number(e.target.value) })
          }
        >
          {flows.map((flow) => (
            <option key={flow.flow_id} value={flow.flow_id}>
              {flow.flow_id}
              {flow.remark ? ` - ${flow.remark}` : ""}
            </option>
          ))}
        </select>
      ) : mark.action.t !== "drop" ? (
        <Checkbox
          isSelected={mark.allow_reuse_port}
          onChange={(allow_reuse_port) =>
            onChange({ ...mark, allow_reuse_port })
          }
        >
          {t("flow.mark_edit.nat1_label")}
        </Checkbox>
      ) : null}
    </div>
  );
}

function DnsRuleEditor({
  id,
  flowId,
  open,
  close,
  refresh,
}: {
  id?: string;
  flowId: number;
  open: boolean;
  close: () => void;
  refresh: () => void;
}) {
  const { t } = useI18n();
  const [rule, setRule] = useState<DNSRuleConfig>();
  const [origin, setOrigin] = useState("");
  const [upstreams, setUpstreams] = useState<
    Array<{ id?: string; remark: string }>
  >([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRule(undefined);
    setError("");
    void Promise.all([
      id ? get_dns_rule(id) : Promise.resolve(new DnsRule({ flow_id: flowId })),
      get_dns_upstreams(),
    ])
      .then(([value, available]) => {
        setRule(value);
        setOrigin(JSON.stringify(value));
        setUpstreams(Array.isArray(available) ? available : []);
      })
      .catch(() => setError(t("common.load_failed")));
  }, [flowId, id, open, t]);
  const save = async () => {
    if (!rule) return;
    if (rule.index < 0)
      return setError(t("dns.rule_edit.duplicate_priority_warning"));
    setSaving(true);
    try {
      await push_dns_rule(new DnsRule(rule));
      close();
      refresh();
    } finally {
      setSaving(false);
    }
  };
  const paste = async (append: boolean) => {
    try {
      const source = JSON.parse(await navigator.clipboard.readText());
      setRule(
        (value) =>
          value && {
            ...value,
            source: append ? [...source, ...value.source] : source,
          },
      );
    } catch {
      setError(t("common.paste_failed"));
    }
  };
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(value) => !value && close()}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("dns.rule_edit.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="rule-editor">
            {!rule ? (
              <Skeleton />
            ) : (
              <>
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>{error}</Alert.Content>
                  </Alert>
                )}
                <div className="rule-form-grid">
                  <TextField>
                    <Label>{t("dns.rule_edit.priority")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={String(rule.index)}
                      onChange={(e) =>
                        setRule({ ...rule, index: Number(e.target.value) })
                      }
                    />
                  </TextField>
                  <label>
                    {t("dns.rule_edit.filter_result")}
                    <select
                      value={rule.filter}
                      onChange={(e) =>
                        setRule({
                          ...rule,
                          filter: e.target.value as DNSRuleConfig["filter"],
                        })
                      }
                    >
                      <option value="unfilter">
                        {t("dns.rule_edit.filter_unfilter")}
                      </option>
                      <option value="only_ipv4">
                        {t("dns.rule_edit.filter_ipv4")}
                      </option>
                      <option value="only_ipv6">
                        {t("dns.rule_edit.filter_ipv6")}
                      </option>
                    </select>
                  </label>
                </div>
                <TextField>
                  <Label>{t("dns.rule_edit.remark")}</Label>
                  <Input
                    value={rule.name}
                    onChange={(e) => setRule({ ...rule, name: e.target.value })}
                  />
                </TextField>
                <Switch
                  isSelected={rule.enable}
                  onChange={(enable) => setRule({ ...rule, enable })}
                >
                  {rule.enable ? t("common.enabled") : t("common.disabled")}
                </Switch>
                <fieldset>
                  <legend>{t("dns.rule_edit.flow_action")}</legend>
                  <MarkEditor
                    mark={rule.mark}
                    onChange={(mark) => setRule({ ...rule, mark })}
                  />
                </fieldset>
                <label>
                  {t("dns.rule_edit.upstream_select")}
                  <select
                    value={rule.upstream_id}
                    onChange={(e) =>
                      setRule({ ...rule, upstream_id: e.target.value })
                    }
                  >
                    <option value="">-</option>
                    {upstreams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.remark || item.id}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>{t("dns.rule_edit.source_rules_title")}</legend>
                  <div className="rule-toolbar">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        navigator.clipboard.writeText(
                          JSON.stringify(rule.source, null, 2),
                        )
                      }
                    >
                      {t("dns.rule_edit.copy")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => paste(false)}
                    >
                      {t("dns.rule_edit.paste_replace")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => paste(true)}
                    >
                      {t("dns.rule_edit.paste_append")}
                    </Button>
                  </div>
                  <MatchRulesEditor
                    rules={rule.source}
                    onChange={(source) => setRule({ ...rule, source })}
                  />
                </fieldset>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={close}>
              {t("common.cancel")}
            </Button>
            <Button
              isPending={saving}
              isDisabled={!rule || JSON.stringify(rule) === origin}
              onPress={save}
            >
              {t("common.save")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function IpSources({
  value,
  onChange,
}: {
  value: WanIPRuleSource[];
  onChange: (value: WanIPRuleSource[]) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="dns-string-list">
      {value.map((source, index) => (
        <div className="ip-rule-source" key={index}>
          <select
            aria-label={t("common.type")}
            value={source.t}
            onChange={(e) =>
              onChange(
                value.map((item, i) =>
                  i !== index
                    ? item
                    : e.target.value === "geo_key"
                      ? {
                          t: "geo_key",
                          name: "",
                          key: "",
                          inverse: false,
                          attribute_key: null,
                        }
                      : { t: "config", ip: "0.0.0.0", prefix: 32 },
                ),
              )
            }
          >
            <option value="geo_key">
              {t("flow.wan_rule_edit.source_style_geo")}
            </option>
            <option value="config">
              {t("flow.wan_rule_edit.source_style_exact")}
            </option>
          </select>
          {source.t === "config" ? (
            <>
              <Input
                aria-label="IP"
                value={source.ip}
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index && item.t === "config"
                        ? { ...item, ip: e.target.value }
                        : item,
                    ),
                  )
                }
              />
              <Input
                aria-label={t("flow.match_rule.prefix_placeholder")}
                type="number"
                min={0}
                max={source.ip.includes(":") ? 128 : 32}
                value={String(source.prefix)}
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index && item.t === "config"
                        ? { ...item, prefix: Number(e.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </>
          ) : (
            <>
              <Input
                aria-label={t("common.select_geo_name")}
                value={source.name}
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index && item.t === "geo_key"
                        ? { ...item, name: e.target.value }
                        : item,
                    ),
                  )
                }
              />
              <Input
                aria-label={t("common.filter_key")}
                value={source.key}
                onChange={(e) =>
                  onChange(
                    value.map((item, i) =>
                      i === index && item.t === "geo_key"
                        ? { ...item, key: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="danger-soft"
            aria-label={t("common.delete")}
            onPress={() => onChange(value.filter((_, i) => i !== index))}
          >
            −
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onPress={() =>
          onChange([...value, { t: "config", ip: "0.0.0.0", prefix: 32 }])
        }
      >
        + {t("flow.wan_rule_edit.add_wan_rule")}
      </Button>
    </div>
  );
}

function IpRuleEditor({
  id,
  flowId,
  open,
  close,
  refresh,
}: {
  id?: string;
  flowId: number;
  open: boolean;
  close: () => void;
  refresh: () => void;
}) {
  const { t } = useI18n();
  const [rule, setRule] = useState<WanIpRuleConfig>();
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRule(undefined);
    setError("");
    void (
      id
        ? get_dst_ip_rules_rule(id)
        : Promise.resolve(new WanIpRuleConfigClass({ flow_id: flowId }))
    )
      .then((value) => {
        setRule(value);
        setOrigin(JSON.stringify(value));
      })
      .catch(() => setError(t("common.load_failed")));
  }, [flowId, id, open, t]);
  const save = async () => {
    if (!rule) return;
    if (rule.index < 0)
      return setError(t("flow.wan_rule_edit.duplicate_priority_warning"));
    for (const source of rule.source)
      if (
        source.t === "config" &&
        (!isIP(source.ip) ||
          source.prefix < 0 ||
          source.prefix > (source.ip.includes(":") ? 128 : 32))
      )
        return setError(t("common.ip_format_invalid"));
    setSaving(true);
    try {
      id
        ? await update_dst_ip_rules_rule(id, rule)
        : await push_dst_ip_rules_rule(rule);
      close();
      refresh();
    } finally {
      setSaving(false);
    }
  };
  const paste = async (append: boolean) => {
    try {
      const source = JSON.parse(await navigator.clipboard.readText());
      setRule(
        (value) =>
          value && {
            ...value,
            source: append ? [...source, ...value.source] : source,
          },
      );
    } catch {
      setError(t("common.paste_failed"));
    }
  };
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(value) => !value && close()}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("flow.wan_rule_edit.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="rule-editor">
            {!rule ? (
              <Skeleton />
            ) : (
              <>
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>{error}</Alert.Content>
                  </Alert>
                )}
                <div className="rule-form-grid">
                  <TextField>
                    <Label>{t("flow.wan_rule_edit.priority")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={String(rule.index)}
                      onChange={(e) =>
                        setRule({ ...rule, index: Number(e.target.value) })
                      }
                    />
                  </TextField>
                  <Switch
                    isSelected={rule.enable}
                    onChange={(enable) => setRule({ ...rule, enable })}
                  >
                    {rule.enable ? t("common.enabled") : t("common.disabled")}
                  </Switch>
                </div>
                <TextField>
                  <Label>{t("flow.wan_rule_edit.remark")}</Label>
                  <Input
                    value={rule.remark}
                    onChange={(e) =>
                      setRule({ ...rule, remark: e.target.value })
                    }
                  />
                </TextField>
                <fieldset>
                  <legend>{t("flow.wan_rule_edit.egress_select")}</legend>
                  <MarkEditor
                    mark={rule.mark}
                    onChange={(mark) => setRule({ ...rule, mark })}
                  />
                </fieldset>
                <fieldset>
                  <legend>{t("flow.wan_rule_edit.matched_ips")}</legend>
                  <div className="rule-toolbar">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        navigator.clipboard.writeText(
                          JSON.stringify(rule.source, null, 2),
                        )
                      }
                    >
                      {t("flow.wan_rule_edit.copy")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => paste(false)}
                    >
                      {t("flow.wan_rule_edit.paste_replace")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => paste(true)}
                    >
                      {t("flow.wan_rule_edit.paste_append")}
                    </Button>
                  </div>
                  <IpSources
                    value={rule.source}
                    onChange={(source) => setRule({ ...rule, source })}
                  />
                </fieldset>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={close}>
              {t("common.cancel")}
            </Button>
            <Button
              isPending={saving}
              isDisabled={!rule || JSON.stringify(rule) === origin}
              onPress={save}
            >
              {t("common.save")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function DnsDiagnostic({
  open,
  flowId,
  close,
}: {
  open: boolean;
  flowId: number;
  close: () => void;
}) {
  const { t } = useI18n();
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState<"A" | "AAAA" | "HTTPS">("A");
  const [result, setResult] = useState<CheckChainDnsResult>();
  const [busy, setBusy] = useState(false);
  const normalized = () => {
    const input = domain.trim();
    if (!input) return "";
    try {
      return new URL(input).hostname;
    } catch {
      try {
        return new URL(`http://${input.replace(/\/.*$/, "")}`).hostname;
      } catch {
        return input;
      }
    }
  };
  const run = async (action: "query" | "delete" | "refresh") => {
    const value = normalized();
    if (!value) return;
    setDomain(value);
    setBusy(true);
    try {
      const req = {
        flow_id: flowId,
        domain: value,
        record_type: recordType,
        apply_filter: false,
      };
      setResult(
        await (action === "query"
          ? check_domain(req)
          : action === "delete"
            ? invalidate_domain_cache(req)
            : refresh_domain_cache(req)),
      );
      toast.success(
        action === "delete"
          ? t("dns.check_domain.delete_cache_success")
          : action === "refresh"
            ? t("dns.check_domain.refresh_cache_success")
            : t("common.update_success"),
      );
    } finally {
      setBusy(false);
    }
  };
  const records = (items?: unknown[]) =>
    items?.length ? (
      items.map((item, index) => (
        <Chip size="sm" key={index}>
          <Chip.Label>
            {typeof item === "string" ? item : JSON.stringify(item)}
          </Chip.Label>
        </Chip>
      ))
    ) : (
      <span className="drawer-description">{t("common.no_data")}</span>
    );
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(value) => !value && close()}
      isDismissable={false}
    >
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {t("dns.check_domain.test_flow_query", { flow_id: flowId })}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="rule-editor">
            <div className="rule-toolbar">
              {[
                ["A", "www.baidu.com", "IPv4 Baidu"],
                ["AAAA", "www.baidu.com", "IPv6 Baidu"],
                ["HTTPS", "crypto.cloudflare.com", "HTTPS CF"],
              ].map(([type, host, label]) => (
                <Button
                  key={label}
                  size="sm"
                  variant="secondary"
                  isDisabled={busy}
                  onPress={() => {
                    setRecordType(type as "A" | "AAAA" | "HTTPS");
                    setDomain(host);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="diagnostic-query">
              <select
                aria-label={t("common.type")}
                value={recordType}
                onChange={(e) =>
                  setRecordType(e.target.value as "A" | "AAAA" | "HTTPS")
                }
              >
                <option>A</option>
                <option>AAAA</option>
                <option>HTTPS</option>
              </select>
              <Input
                aria-label={t("dns.check_domain.enter_domain")}
                value={domain}
                placeholder={t("dns.check_domain.query_instruction")}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void run("query")}
              />
              <Button isPending={busy} onPress={() => run("query")}>
                {t("common.details")}
              </Button>
            </div>
            <p className="drawer-description">
              {t("dns.check_domain.diagnostic_hint")}
            </p>
            <div className="rule-toolbar">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={!domain || busy}
                onPress={() =>
                  confirm(t("dns.check_domain.confirm_delete_cache")) &&
                  run("delete")
                }
              >
                {t("dns.check_domain.delete_cache")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={
                  !domain ||
                  !result?.rule_id ||
                  Boolean(result?.redirect_id) ||
                  busy
                }
                onPress={() =>
                  confirm(t("dns.check_domain.confirm_refresh_cache")) &&
                  run("refresh")
                }
              >
                {t("dns.check_domain.refresh_cache")}
              </Button>
            </div>
            {result?.query_filtered && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  {t("dns.check_domain.query_filtered_hint")}
                </Alert.Content>
              </Alert>
            )}
            {result && (
              <Card>
                <Card.Content>
                  <div className="diagnostic-section">
                    <strong>{t("dns.check_domain.upstream_result")}</strong>
                    <div className="rule-source-summary">
                      {records(result.records)}
                    </div>
                    <strong>{t("dns.check_domain.cache_result")}</strong>
                    <div className="rule-source-summary">
                      {records(result.cache_records)}
                    </div>
                    {result.redirect_id && (
                      <>
                        <strong>{t("dns.check_domain.redirect_result")}</strong>
                        <span>{result.redirect_id}</span>
                      </>
                    )}
                  </div>
                </Card.Content>
              </Card>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={close}>
              {t("common.close")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function RuleDrawers({
  kind,
  flowId = 0,
  onClose,
}: {
  kind?: Kind;
  flowId?: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [rules, setRules] = useState<Array<DNSRuleConfig | WanIpRuleConfig>>(
    [],
  );
  const [activeKind, setActiveKind] = useState<Kind>(kind ?? "dns");
  const [upstreamNames, setUpstreamNames] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<string | null | undefined>();
  const [diagnostic, setDiagnostic] = useState(false);
  useEffect(() => {
    if (kind) setActiveKind(kind);
  }, [kind]);
  const load = useCallback(async () => {
    if (!kind) return;
    setLoading(true);
    setError(false);
    try {
      const [value, upstreams] =
        activeKind === "dns"
          ? await Promise.all([get_flow_dns_rules(flowId), get_dns_upstreams()])
          : [await get_flow_dst_ip_rules(flowId), []];
      setRules(Array.isArray(value) ? value : []);
      setUpstreamNames(
        Object.fromEntries(
          (Array.isArray(upstreams) ? upstreams : []).map((upstream) => [
            String(upstream.id),
            upstream.remark,
          ]),
        ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeKind, flowId, kind]);
  useEffect(() => {
    void load();
  }, [load]);
  const exportAll = async () => {
    const value =
      activeKind === "dns"
        ? await get_flow_dns_rules(flowId)
        : await get_flow_dst_ip_rules(flowId);
    await navigator.clipboard.writeText(
      JSON.stringify(
        value,
        (key, item) => (key === "id" ? undefined : item),
        2,
      ),
    );
    toast.success(t("common.copy_success"));
  };
  const importAll = async () => {
    if (
      !confirm(
        t(
          activeKind === "dns"
            ? "dns.rule_drawer.confirm_import"
            : "flow.wan_rule_drawer.confirm_import",
        ),
      )
    )
      return;
    try {
      const value = JSON.parse(await navigator.clipboard.readText()).map(
        (rule: DNSRuleConfig | WanIpRuleConfig) => ({
          ...rule,
          flow_id: flowId,
        }),
      );
      activeKind === "dns"
        ? await push_many_dns_rule(value)
        : await push_many_dst_ip_rule(value);
      await load();
    } catch {
      toast.danger(t("common.paste_failed"));
    }
  };
  const remove = async (rule: DNSRuleConfig | WanIpRuleConfig) => {
    if (!rule.id || !confirm(t("common.confirm_delete"))) return;
    activeKind === "dns"
      ? await delete_dns_rule(rule.id)
      : await delete_dst_ip_rules_rule(rule.id);
    await load();
  };
  const closeEditor = () => setEditing(undefined);
  return (
    <>
      <Modal.Backdrop
        isOpen={Boolean(kind)}
        onOpenChange={(open) => !open && onClose()}
      >
        <Modal.Container size="cover" scroll="inside">
          <Modal.Dialog className="rule-manager-dialog">
            <Modal.CloseTrigger aria-label={t("common.close")} />
            <Modal.Header>
              <Modal.Heading>{t("flow.edit.title")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="rule-tabs" role="tablist">
                {(["dns", "ip"] as const).map((tab) => (
                  <button
                    className="rule-tab"
                    type="button"
                    role="tab"
                    aria-selected={activeKind === tab}
                    key={tab}
                    onClick={() => {
                      setEditing(undefined);
                      setActiveKind(tab);
                    }}
                  >
                    {t(
                      tab === "dns"
                        ? "flow.edit.tab_dns"
                        : "flow.edit.tab_target_ip",
                    )}
                  </button>
                ))}
              </div>
              <div className="rule-toolbar">
                <Button size="sm" onPress={() => setEditing(null)}>
                  +{" "}
                  {t(
                    activeKind === "dns"
                      ? "dns.rule_drawer.add_rule"
                      : "flow.wan_rule_drawer.add_rule",
                  )}
                </Button>
                <Button size="sm" variant="secondary" onPress={exportAll}>
                  {t(
                    activeKind === "dns"
                      ? "dns.rule_drawer.export_clipboard"
                      : "flow.wan_rule_drawer.export_clipboard",
                  )}
                </Button>
                <Button size="sm" variant="secondary" onPress={importAll}>
                  {t(
                    activeKind === "dns"
                      ? "dns.rule_drawer.import_clipboard"
                      : "flow.wan_rule_drawer.import_clipboard",
                  )}
                </Button>
                {activeKind === "dns" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={t("dns.check_domain.test_flow_query", {
                      flow_id: flowId,
                    })}
                    onPress={() => setDiagnostic(true)}
                  >
                    ⌕
                  </Button>
                )}
              </div>
              {loading ? (
                <Skeleton className="rules-skeleton" />
              ) : error ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>{t("common.load_failed")}</Alert.Title>
                    <Button size="sm" onPress={load}>
                      {t("common.retry")}
                    </Button>
                  </Alert.Content>
                </Alert>
              ) : rules.length === 0 ? (
                <p className="drawer-description">{t("common.no_data")}</p>
              ) : (
                <div className="rule-table-wrap">
                  <table className="rule-table">
                    <thead>
                      <tr>
                        <th>
                          {t("common.status")} / {t("common.priority")}
                        </th>
                        <th>{t("dns.rule_card.match_rules")}</th>
                        {activeKind === "dns" && (
                          <th>{t("dns.rule_card.upstream_config")}</th>
                        )}
                        <th>{t("dns.rule_card.traffic_action")}</th>
                        <th>{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr key={rule.id ?? rule.index}>
                          <td>
                            <div className="rule-status">
                              <span
                                className={`rule-status-dot ${rule.enable ? "is-enabled" : ""}`}
                              />
                              <strong>
                                {rule.index}:{" "}
                                {("name" in rule ? rule.name : rule.remark) ||
                                  t("common.no_remark")}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <div className="rule-source-summary">
                              {rule.source.length
                                ? rule.source.map((source, index) => (
                                    <Chip size="sm" key={index}>
                                      <Chip.Label>
                                        {source.t === "geo_key"
                                          ? `Geo: ${source.name}/${source.key}`
                                          : "value" in source
                                            ? `${source.match_type}: ${source.value}`
                                            : `${source.ip}/${source.prefix}`}
                                      </Chip.Label>
                                    </Chip>
                                  ))
                                : t(
                                    activeKind === "dns"
                                      ? "dns.rule_card.no_match_rules"
                                      : "flow.wan_rule_card.no_match_rules",
                                  )}
                            </div>
                          </td>
                          {activeKind === "dns" && (
                            <td>
                              <Chip color="accent" size="sm">
                                <Chip.Label>
                                  {upstreamNames[
                                    String((rule as DNSRuleConfig).upstream_id)
                                  ] ||
                                    (rule as DNSRuleConfig).upstream_id ||
                                    "-"}
                                </Chip.Label>
                              </Chip>
                            </td>
                          )}
                          <td>{markText(rule.mark, t)}</td>
                          <td>
                            <div className="rule-actions">
                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setEditing(rule.id ?? null)}
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger-soft"
                                onPress={() => remove(rule)}
                              >
                                {t("common.delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      {activeKind === "dns" ? (
        <DnsRuleEditor
          id={editing ?? undefined}
          flowId={flowId}
          open={editing !== undefined}
          close={closeEditor}
          refresh={load}
        />
      ) : (
        <IpRuleEditor
          id={editing ?? undefined}
          flowId={flowId}
          open={editing !== undefined}
          close={closeEditor}
          refresh={load}
        />
      )}
      <DnsDiagnostic
        open={diagnostic}
        flowId={flowId}
        close={() => setDiagnostic(false)}
      />
    </>
  );
}
