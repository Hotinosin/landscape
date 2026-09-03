import { useCallback, useEffect, useMemo, useState } from "react";
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
  Tooltip,
} from "@heroui/react";
import { useSearchParams } from "react-router-dom";
import { isIP } from "is-ip";
import type {
  DNSRedirectRule,
  DnsUpstreamConfig,
  RuleSource,
} from "@landscape-router/types/api/schemas";
import { getFlowRules } from "@landscape-router/types/api/flow-rules/flow-rules";
import {
  delete_dns_upstream,
  get_dns_upstream,
  get_dns_upstreams,
  push_dns_upstream,
  test_dns_upstream_h3,
  type DnsUpstreamH3TestResult,
} from "@/api/dns_rule/upstream";
import {
  delete_dns_redirect,
  get_dns_redirect,
  get_dns_redirects,
  push_dns_redirect,
} from "@/api/dns_rule/redirect";
import { DnsUpstreamModeTsEnum, upstream_mode_exhibit_name } from "@/lib/dns";
import { useI18n } from "./i18n";

type UpstreamMode = DnsUpstreamConfig["mode"]["t"];
const modes: UpstreamMode[] = ["plaintext", "https", "tls", "quic"];
const h3Domains = new Set([
  "dns.alidns.com",
  "cloudflare-dns.com",
  "dns.google",
]);
const presets: Record<string, Omit<DnsUpstreamConfig, "id" | "remark">> = {
  "Aliyun UDP": {
    mode: { t: "plaintext" },
    ips: ["223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"],
    port: 53,
    enable_ip_validation: false,
  },
  "Aliyun DoH": {
    mode: {
      t: "https",
      domain: "dns.alidns.com",
      http_endpoint: null,
      http3: false,
    },
    ips: ["223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"],
    port: 443,
    enable_ip_validation: false,
  },
  "Aliyun DoT": {
    mode: { t: "tls", domain: "dns.alidns.com" },
    ips: ["223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"],
    port: 853,
    enable_ip_validation: false,
  },
  "Aliyun DoQ": {
    mode: { t: "quic", domain: "dns.alidns.com" },
    ips: ["223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"],
    port: 853,
    enable_ip_validation: false,
  },
  "DNSPod UDP": {
    mode: { t: "plaintext" },
    ips: ["119.29.29.29", "119.28.28.28", "240c::6666", "240c::6644", "182.254.116.116", "2402:4e00::"],
    port: 53,
    enable_ip_validation: false,
  },
  "DNSPod DoH": {
    mode: { t: "https", domain: "dns.pub", http_endpoint: null, http3: false },
    ips: ["1.12.12.21", "120.53.53.53"],
    port: 443,
    enable_ip_validation: false,
  },
  "Cloudflare UDP": {
    mode: { t: "plaintext" },
    ips: ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001"],
    port: 53,
    enable_ip_validation: false,
  },
  "Cloudflare DoH": {
    mode: {
      t: "https",
      domain: "cloudflare-dns.com",
      http_endpoint: null,
      http3: false,
    },
    ips: ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001"],
    port: 443,
    enable_ip_validation: false,
  },
  "Cloudflare DoT": {
    mode: { t: "tls", domain: "cloudflare-dns.com" },
    ips: ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001"],
    port: 853,
    enable_ip_validation: false,
  },
  "Google UDP": {
    mode: { t: "plaintext" },
    ips: ["8.8.8.8", "8.8.4.4", "2001:4860:4860::8888", "2001:4860:4860::8844"],
    port: 53,
    enable_ip_validation: false,
  },
  "Google DoH": {
    mode: {
      t: "https",
      domain: "dns.google",
      http_endpoint: null,
      http3: false,
    },
    ips: ["8.8.8.8", "8.8.4.4", "2001:4860:4860::8888", "2001:4860:4860::8844"],
    port: 443,
    enable_ip_validation: false,
  },
  "Google DoT": {
    mode: { t: "tls", domain: "dns.google" },
    ips: ["8.8.8.8", "8.8.4.4", "2001:4860:4860::8888", "2001:4860:4860::8844"],
    port: 853,
    enable_ip_validation: false,
  },
};

function PageState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  retry: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  if (loading)
    return (
      <div className="dns-skeletons" aria-label={t("common.loading")}>
        <Skeleton />
        <Skeleton />
      </div>
    );
  if (error)
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("common.load_failed")}</Alert.Title>
          <Button size="sm" variant="secondary" onPress={retry}>
            {t("common.retry")}
          </Button>
        </Alert.Content>
      </Alert>
    );
  if (empty)
    return (
      <Card>
        <Card.Content className="dns-empty">{t("common.no_data")}</Card.Content>
      </Card>
    );
  return children;
}

function StringsEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const { t } = useI18n();
  return (
    <div className="dns-string-list">
      {values.map((value, index) => (
        <div className="dns-string-row" key={index}>
          <Input
            aria-label={`${placeholder} ${index + 1}`}
            value={value}
            placeholder={placeholder}
            onChange={(event) =>
              onChange(
                values.map((item, i) =>
                  i === index ? event.target.value : item,
                ),
              )
            }
          />
          <Button
            isIconOnly
            size="sm"
            variant="danger-soft"
            aria-label={t("common.delete")}
            onPress={() => onChange(values.filter((_, i) => i !== index))}
          >
            −
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onPress={() => onChange([...values, ""])}
      >
        + {placeholder}
      </Button>
    </div>
  );
}

function UpstreamEditor({
  id,
  open,
  onOpenChange,
  onSaved,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [rule, setRule] = useState<DnsUpstreamConfig>();
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DnsUpstreamH3TestResult>();
  useEffect(() => {
    if (!open) return;
    setRule(undefined);
    setError("");
    setTestResult(undefined);
    void (
      id
        ? get_dns_upstream(id)
        : Promise.resolve<DnsUpstreamConfig>({
            remark: "",
            mode: { t: "plaintext" },
            ips: [],
            port: 53,
            enable_ip_validation: false,
          })
    )
      .then((value) => {
        setRule(value);
        setOrigin(JSON.stringify(value));
      })
      .catch(() => setError(t("common.load_failed")));
  }, [id, open, t]);
  const setMode = (mode: UpstreamMode) =>
    setRule(
      (current) =>
        current && {
          ...current,
          mode:
            mode === "plaintext"
              ? { t: mode }
              : mode === "https"
                ? { t: mode, domain: "", http_endpoint: null, http3: false }
                : { t: mode, domain: "" },
        },
    );
  const setEndpoint = (http_endpoint: string) =>
    setRule((current) =>
      current?.mode.t === "https"
        ? { ...current, mode: { ...current.mode, http_endpoint } }
        : current,
    );
  const setHttp3 = (http3: boolean) =>
    setRule((current) =>
      current?.mode.t === "https"
        ? { ...current, mode: { ...current.mode, http3 } }
        : current,
    );
  const validate = () => {
    if (!rule?.ips.length) return t("dns.upstream_edit.err_ips_required");
    if (rule.ips.some((ip) => !isIP(ip)))
      return t("dns.upstream_edit.err_ip_invalid");
    if (!rule.port || rule.port < 1 || rule.port > 65535)
      return t("dns.upstream_edit.port_placeholder");
    if (
      rule.mode.t !== "plaintext" &&
      !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(rule.mode.domain)
    )
      return t("dns.upstream_edit.err_domain_invalid");
    return "";
  };
  const save = async () => {
    const invalid = validate();
    if (invalid) return setError(invalid);
    if (!rule) return;
    setSaving(true);
    setError("");
    try {
      const next =
        rule.mode.t === "https"
          ? {
              ...rule,
              mode: {
                ...rule.mode,
                http_endpoint: rule.mode.http_endpoint?.trim() || null,
                http3:
                  h3Domains.has(rule.mode.domain) && Boolean(rule.mode.http3),
              },
            }
          : rule;
      await push_dns_upstream(next);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };
  const copy = () =>
    rule && navigator.clipboard.writeText(JSON.stringify(rule, null, 2));
  const paste = async () => {
    try {
      setRule(
        JSON.parse(await navigator.clipboard.readText()) as DnsUpstreamConfig,
      );
      setError("");
    } catch {
      setError(t("common.invalid_format"));
    }
  };
  const testH3 = async () => {
    if (!rule) return;
    const invalid = validate();
    if (invalid) return setError(invalid);
    setTesting(true);
    try {
      setTestResult(await test_dns_upstream_h3(rule));
    } finally {
      setTesting(false);
    }
  };
  const domain = rule?.mode.t === "plaintext" ? "" : rule?.mode.domain;
  const supportsH3 =
    rule?.mode.t === "https" && h3Domains.has(rule.mode.domain);
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("dns.upstream_edit.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="dns-editor">
            {!rule ? (
              <Skeleton />
            ) : (
              <>
                <div className="dns-editor-tools">
                  <Button size="sm" variant="secondary" onPress={copy}>
                    {t("dns.upstream_edit.copy")}
                  </Button>
                  <Button size="sm" variant="secondary" onPress={paste}>
                    {t("dns.upstream_edit.paste")}
                  </Button>
                </div>
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>{error}</Alert.Content>
                  </Alert>
                )}
                <div className="dns-form-grid">
                  <TextField>
                    <Label>{t("dns.upstream_edit.remark")}</Label>
                    <Input
                      value={rule.remark}
                      placeholder={t("dns.upstream_edit.remark_placeholder")}
                      onChange={(e) =>
                        setRule({ ...rule, remark: e.target.value })
                      }
                    />
                  </TextField>
                  <Switch
                    isSelected={Boolean(rule.enable_ip_validation)}
                    onChange={(value) =>
                      setRule({ ...rule, enable_ip_validation: value })
                    }
                  >
                    {t("dns.upstream_edit.ip_validation")}
                  </Switch>
                </div>
                <fieldset>
                  <legend>{t("dns.upstream_edit.preset_fill")}</legend>
                  <div className="dns-presets">
                    {Object.entries(presets).map(([name, preset]) => (
                      <Button
                        key={name}
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          setRule({
                            ...preset,
                            id: rule.id,
                            remark: rule.remark,
                            update_at: rule.update_at,
                          })
                        }
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  {t("dns.upstream_edit.request_mode")}
                  <select
                    value={rule.mode.t}
                    onChange={(e) => setMode(e.target.value as UpstreamMode)}
                  >
                    {modes.map((mode) => (
                      <option key={mode} value={mode}>
                        {upstream_mode_exhibit_name(mode)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dns-form-grid">
                  <TextField>
                    <Label>{t("dns.upstream_edit.port")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      value={String(rule.port ?? "")}
                      onChange={(e) =>
                        setRule({ ...rule, port: Number(e.target.value) })
                      }
                    />
                  </TextField>
                  {domain !== "" || rule.mode.t !== "plaintext" ? (
                    <TextField>
                      <Label>{t("dns.upstream_edit.domain")}</Label>
                      <Input
                        value={domain}
                        placeholder={t("dns.upstream_edit.domain_placeholder")}
                        onChange={(e) =>
                          rule.mode.t !== "plaintext" &&
                          setRule({
                            ...rule,
                            mode: { ...rule.mode, domain: e.target.value },
                          })
                        }
                      />
                    </TextField>
                  ) : null}
                </div>
                {rule.mode.t === "https" && (
                  <div className="dns-form-grid">
                    <TextField>
                      <Label>{t("dns.upstream_edit.url")}</Label>
                      <Input
                        value={rule.mode.http_endpoint ?? ""}
                        placeholder={t("dns.upstream_edit.url_placeholder")}
                        onChange={(e) => setEndpoint(e.target.value)}
                      />
                    </TextField>
                    {supportsH3 && (
                      <div className="dns-inline">
                        <Checkbox
                          isSelected={Boolean(rule.mode.http3)}
                          onChange={setHttp3}
                        >
                          HTTP/3
                        </Checkbox>
                        <Button size="sm" isPending={testing} onPress={testH3}>
                          {t("dns.upstream_edit.test_h3")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <fieldset>
                  <legend>{t("dns.upstream_edit.server_ips")}</legend>
                  <StringsEditor
                    values={rule.ips}
                    onChange={(ips) => setRule({ ...rule, ips })}
                    placeholder={t("dns.upstream_edit.enter_ip_v46")}
                  />
                </fieldset>
                {testResult && (
                  <Alert
                    status={
                      testResult.attempts.some((attempt) => !attempt.error)
                        ? "success"
                        : "danger"
                    }
                  >
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>
                        {t(
                          testResult.attempts.some((attempt) => !attempt.error)
                            ? "dns.upstream_edit.h3_test_success"
                            : "dns.upstream_edit.h3_test_failed",
                        )}
                      </Alert.Title>
            <div>{t("dns.upstream_edit.test_domain")}: {testResult.query_domain}</div>
            <div>{t("dns.upstream_edit.reuse_average")}: {testResult.reuse_average_ms == null ? "-" : `${testResult.reuse_average_ms.toFixed(2)} ms`}</div>
                      {testResult.attempts.map((attempt, index) => (
                        <div key={index}>
                          {attempt.latency_ms.toFixed(2)} ms ·{" "}
                          {attempt.error || attempt.answers.join(", ") || "-"}
                        </div>
                      ))}
                    </Alert.Content>
                  </Alert>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={() => onOpenChange(false)}>
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

export function DnsUpstreamPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [rules, setRules] = useState<DnsUpstreamConfig[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [editing, setEditing] = useState<string | null | undefined>(undefined);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await get_dns_upstreams();
      setRules(Array.isArray(result) ? result : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const id = params.get("edit");
    if (id) setEditing(id);
  }, [params]);
  const close = (open: boolean) => {
    if (open) return;
    setEditing(undefined);
    if (params.has("edit")) {
      params.delete("edit");
      setParams(params, { replace: true });
    }
  };
  const remove = async (rule: DnsUpstreamConfig) => {
    if (rule.id && confirm(t("dns.upstream_card.confirm_delete"))) {
      await delete_dns_upstream(rule.id);
      await load();
    }
  };
  return (
    <section className="dns-page">
      <header className="dns-page-header">
        <div>
          <h1>{t("routes.dns-upstream")}</h1>
          <p>{t("dns.upstream_edit.ip_validation_desc_2")}</p>
        </div>
        <Button onPress={() => setEditing(null)}>+ {t("common.create")}</Button>
      </header>
      <PageState
        loading={loading}
        error={error}
        empty={!rules.length}
        retry={load}
      >
        <div className="dns-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("dns.upstream_card.upstream_ip")}</th>
                <th>{t("dns.upstream_card.request_port")}</th>
                <th>{t("dns.upstream_card.domain_addr")}</th>
                <th>{t("dns.upstream_card.request_mode")}</th>
                <th>{t("common.remark")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id ?? `${rule.ips}:${rule.port}`}>
                  <td>
                    <div className="dns-chips">
                      {rule.ips.map((ip) => (
                        <Chip key={ip} size="sm">
                          <Chip.Label>{ip}</Chip.Label>
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td>{rule.port}</td>
                  <td>
                    {rule.mode.t === "plaintext"
                      ? t("dns.upstream_card.no_config")
                      : `${rule.mode.domain}${rule.mode.t === "https" ? (rule.mode.http_endpoint ?? "/dns-query") : ""}`}
                  </td>
                  <td>{upstream_mode_exhibit_name(rule.mode.t)}</td>
                  <td>{rule.remark || t("dns.upstream_card.no_remark")}</td>
                  <td>
                    <div className="dns-actions">
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
      </PageState>
      <UpstreamEditor
        id={editing ?? null}
        open={editing !== undefined}
        onOpenChange={close}
        onSaved={load}
      />
    </section>
  );
}

const matchTypes = ["geo_key", "full", "domain", "plain", "regex"] as const;
function MatchRulesEditor({
  rules,
  onChange,
}: {
  rules: RuleSource[];
  onChange: (rules: RuleSource[]) => void;
}) {
  const { t } = useI18n();
  const typeOf = (rule: RuleSource) =>
    rule.t === "geo_key" ? "geo_key" : rule.match_type;
  const valueOf = (rule: RuleSource) =>
    rule.t === "geo_key" ? rule.key : rule.value;
  const changeType = (index: number, type: (typeof matchTypes)[number]) =>
    onChange(
      rules.map((rule, i) =>
        i !== index
          ? rule
          : type === "geo_key"
            ? {
                t: "geo_key",
                key: valueOf(rule),
                name: "",
                inverse: false,
                attribute_key: null,
              }
            : { t: "config", match_type: type, value: valueOf(rule) },
      ),
    );
  return (
    <div className="dns-string-list">
      {rules.map((rule, index) => (
        <div className="dns-rule-row" key={index}>
          <select
            aria-label={t("dns.rule_edit.select_match_type")}
            value={typeOf(rule)}
            onChange={(e) =>
              changeType(index, e.target.value as (typeof matchTypes)[number])
            }
          >
            {matchTypes.map((type) => (
              <option key={type} value={type}>
                {t(
                  `dns.rule_edit.source_style_${type === "geo_key" ? "geo" : type}`,
                )}
              </option>
            ))}
          </select>
          <Input
            value={valueOf(rule)}
            onChange={(e) =>
              onChange(
                rules.map((item, i) =>
                  i !== index
                    ? item
                    : item.t === "geo_key"
                      ? { ...item, key: e.target.value }
                      : { ...item, value: e.target.value },
                ),
              )
            }
          />
          <Button
            isIconOnly
            size="sm"
            variant="danger-soft"
            aria-label={t("common.delete")}
            onPress={() => onChange(rules.filter((_, i) => i !== index))}
          >
            −
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="secondary"
        onPress={() =>
          onChange([
            ...rules,
            {
              t: "geo_key",
              key: "",
              name: "",
              inverse: false,
              attribute_key: null,
            },
          ])
        }
      >
        + {t("dns.rule_edit.add_source_rule")}
      </Button>
    </div>
  );
}

function RedirectEditor({
  id,
  open,
  onOpenChange,
  onSaved,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [rule, setRule] = useState<DNSRedirectRule>();
  const [origin, setOrigin] = useState("");
  const [flows, setFlows] = useState<
    Array<{ flow_id: number; remark?: string | null }>
  >([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setRule(undefined);
    setError("");
    void Promise.all([
      id
        ? get_dns_redirect(id)
        : Promise.resolve<DNSRedirectRule>({
            enable: true,
            remark: "",
            match_rules: [],
            answer_mode: "static_ips",
            result_info: [],
            apply_flows: [],
            block_metadata_queries: true,
          }),
      getFlowRules(),
    ])
      .then(([value, flowRules]) => {
        setRule(value);
        setOrigin(JSON.stringify(value));
        setFlows(flowRules);
      })
      .catch(() => setError(t("common.load_failed")));
  }, [id, open, t]);
  const save = async () => {
    if (!rule) return;
    if (!rule.match_rules.length)
      return setError(t("dns.redirect_edit.err_match_rules_required"));
    if (
      rule.answer_mode === "static_ips" &&
      rule.result_info.some((ip) => !isIP(ip))
    )
      return setError(t("dns.redirect_edit.err_ip_invalid"));
    setSaving(true);
    try {
      await push_dns_redirect(rule);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };
  const importRules = async (append: boolean) => {
    try {
      const next = JSON.parse(
        await navigator.clipboard.readText(),
      ) as RuleSource[];
      setRule(
        (current) =>
          current && {
            ...current,
            match_rules: append ? [...next, ...current.match_rules] : next,
          },
      );
      setError("");
    } catch {
      setError(t("common.invalid_format"));
    }
  };
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("dns.redirect_edit.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="dns-editor">
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
                <div className="dns-form-grid">
                  <TextField>
                    <Label>{t("dns.redirect_edit.remark")}</Label>
                    <Input
                      value={rule.remark}
                      onChange={(e) =>
                        setRule({ ...rule, remark: e.target.value })
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
                <Tooltip>
                  <Tooltip.Trigger>
                    <Switch
                      isSelected={rule.block_metadata_queries !== false}
                      onChange={(block_metadata_queries) =>
                        setRule({ ...rule, block_metadata_queries })
                      }
                    >
                      {t("dns.redirect_edit.block_metadata_queries")}
                    </Switch>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {t("dns.redirect_edit.block_metadata_queries_desc_1")}
                  </Tooltip.Content>
                </Tooltip>
                <label>
                  {t("dns.redirect_edit.apply_flows")}
                  <select
                    multiple
                    value={rule.apply_flows.map(String)}
                    onChange={(e) =>
                      setRule({
                        ...rule,
                        apply_flows: Array.from(
                          e.target.selectedOptions,
                          (option) => Number(option.value),
                        ),
                      })
                    }
                  >
                    <option value="0">
                      {t("dns.redirect_edit.default_flow")}
                    </option>
                    {flows.map((flow) => (
                      <option key={flow.flow_id} value={flow.flow_id}>
                        {flow.flow_id}
                        {flow.remark ? ` - ${flow.remark}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("dns.redirect_edit.answer_mode")}
                  <select
                    value={rule.answer_mode}
                    onChange={(e) =>
                      setRule({
                        ...rule,
                        answer_mode: e.target
                          .value as DNSRedirectRule["answer_mode"],
                      })
                    }
                  >
                    <option value="static_ips">
                      {t("dns.redirect_edit.answer_mode_static_ips")}
                    </option>
                    <option value="all_local_ips">
                      {t("dns.redirect_edit.answer_mode_all_local_ips")}
                    </option>
                  </select>
                </label>
                <fieldset>
                  <legend>{t("dns.redirect_edit.redirect_result")}</legend>
                  {rule.answer_mode === "all_local_ips" ? (
                    <p className="dns-help">
                      {t("dns.redirect_edit.all_local_ips_desc")}
                    </p>
                  ) : (
                    <StringsEditor
                      values={rule.result_info}
                      onChange={(result_info) =>
                        setRule({ ...rule, result_info })
                      }
                      placeholder={t("dns.redirect_edit.enter_ip_v46")}
                    />
                  )}
                </fieldset>
                <fieldset>
                  <legend>{t("dns.redirect_edit.match_rules_header")}</legend>
                  <div className="dns-editor-tools">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        navigator.clipboard.writeText(
                          JSON.stringify(rule.match_rules, null, 2),
                        )
                      }
                    >
                      {t("dns.redirect_edit.copy")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => importRules(false)}
                    >
                      {t("dns.redirect_edit.paste_replace")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => importRules(true)}
                    >
                      {t("dns.redirect_edit.paste_append")}
                    </Button>
                  </div>
                  <MatchRulesEditor
                    rules={rule.match_rules}
                    onChange={(match_rules) =>
                      setRule({ ...rule, match_rules })
                    }
                  />
                </fieldset>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={() => onOpenChange(false)}>
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

function ruleText(source: RuleSource) {
  return source.t === "geo_key"
    ? `Geo: ${source.key}`
    : `${source.match_type}: ${source.value}`;
}
export function DnsRedirectPage() {
  const { t } = useI18n();
  const [rules, setRules] = useState<DNSRedirectRule[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [editing, setEditing] = useState<string | null | undefined>(undefined);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await get_dns_redirects();
      setRules(Array.isArray(result) ? result : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const remove = async (rule: DNSRedirectRule) => {
    if (rule.id && confirm(t("common.confirm_delete"))) {
      await delete_dns_redirect(rule.id);
      await load();
    }
  };
  return (
    <section className="dns-page">
      <header className="dns-page-header">
        <div>
          <h1>{t("routes.dns-redirect")}</h1>
          <p>{t("dns.redirect_edit.apply_flows")}</p>
        </div>
        <Button onPress={() => setEditing(null)}>+ {t("common.create")}</Button>
      </header>
      <PageState
        loading={loading}
        error={error}
        empty={!rules.length}
        retry={load}
      >
        <div className="dns-table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {t("common.status")} / {t("common.remark")}
                </th>
                <th>{t("dns.redirect_card.apply_to")}</th>
                <th>{t("dns.rule_card.match_rules")}</th>
                <th>{t("dns.redirect_card.answer_mode")}</th>
                <th>{t("dns.redirect_card.response_info")}</th>
                <th>{t("dns.redirect_card.block_metadata_queries")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id ?? rule.remark}>
                  <td>
                    <Chip size="sm" color={rule.enable ? "success" : "default"}>
                      <Chip.Label>
                        {rule.enable
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </Chip.Label>
                    </Chip>
                    <div>{rule.remark}</div>
                  </td>
                  <td>
                    {rule.apply_flows.length ? (
                      <div className="dns-chips">
                        {rule.apply_flows.map((flow) => (
                          <Chip size="sm" key={flow}>
                            <Chip.Label>
                              {flow === 0
                                ? t("dns.redirect_card.default_flow")
                                : `Flow ${flow}`}
                            </Chip.Label>
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      t("dns.redirect_card.all_flows")
                    )}
                  </td>
                  <td>
                    <div className="dns-chips">
                      {rule.match_rules.map((source, index) => (
                        <Chip size="sm" key={index}>
                          <Chip.Label>{ruleText(source)}</Chip.Label>
                        </Chip>
                      ))}
                    </div>
                  </td>
                  <td>
                    {t(
                      rule.answer_mode === "all_local_ips"
                        ? "dns.redirect_card.answer_mode_all_local_ips"
                        : "dns.redirect_card.answer_mode_static_ips",
                    )}
                  </td>
                  <td>
                    {rule.answer_mode === "all_local_ips"
                      ? t("dns.redirect_card.response_all_local_ips")
                      : rule.result_info.length
                        ? rule.result_info.join(", ")
                        : t("dns.redirect_card.response_block")}
                  </td>
                  <td>
                    {t(
                      rule.block_metadata_queries !== false
                        ? "dns.redirect_card.block_metadata_queries_on"
                        : "dns.redirect_card.block_metadata_queries_off",
                    )}
                  </td>
                  <td>
                    <div className="dns-actions">
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
      </PageState>
      <RedirectEditor
        id={editing ?? null}
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSaved={load}
      />
    </section>
  );
}
