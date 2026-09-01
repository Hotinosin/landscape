use landscape_macro::LdApiError;
use serde::{Deserialize, Serialize};

use crate::config::ConfigId;

#[derive(thiserror::Error, Debug, LdApiError)]
#[api_error(crate_path = "crate")]
pub enum DnsUpstreamError {
    #[error("DNS upstream config '{0}' not found")]
    #[api_error(id = "dns_upstream.not_found", status = 404)]
    NotFound(ConfigId),

    #[error("H3 test requires a DNS-over-HTTPS upstream")]
    #[api_error(id = "dns_upstream.h3_test_requires_https", status = 400)]
    H3TestRequiresHttps,

    #[error("Failed to create H3 test resolver")]
    #[api_error(id = "dns_upstream.h3_test_resolver_failed", status = 500)]
    H3TestResolverFailed,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct DnsUpstreamH3TestAttempt {
    pub latency_ms: f64,
    pub answers: Vec<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
pub struct DnsUpstreamH3TestResult {
    pub query_domain: String,
    pub attempts: Vec<DnsUpstreamH3TestAttempt>,
    pub reuse_average_ms: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq, Eq)]
#[cfg_attr(feature = "openapi", derive(utoipa::ToSchema))]
#[serde(rename_all = "snake_case")]
#[serde(tag = "t")]
pub enum DnsUpstreamMode {
    #[default]
    Plaintext, // 传统 DNS（UDP/TCP，无加密）
    Tls {
        domain: String,
    }, // DNS over TLS (DoT)
    Https {
        domain: String,
        #[serde(default)]
        #[cfg_attr(feature = "openapi", schema(required = true, nullable = true))]
        http_endpoint: Option<String>,
        #[serde(default)]
        http3: bool,
    }, // DNS over HTTPS (DoH)
    Quic {
        domain: String,
    }, // DNS over Quic (DoQ)
}

#[cfg(test)]
mod tests {
    use super::DnsUpstreamMode;

    #[test]
    fn https3_config_round_trips() {
        let mode = DnsUpstreamMode::Https {
            domain: "dns.example.com".into(),
            http_endpoint: Some("/dns-query".into()),
            http3: true,
        };
        let json = serde_json::to_string(&mode).unwrap();

        assert_eq!(serde_json::from_str::<DnsUpstreamMode>(&json).unwrap(), mode);
        assert!(json.contains(r#""http3":true"#));

        let legacy = r#"{"t":"https","domain":"dns.example.com","http_endpoint":null}"#;
        assert_eq!(
            serde_json::from_str::<DnsUpstreamMode>(legacy).unwrap(),
            DnsUpstreamMode::Https {
                domain: "dns.example.com".into(),
                http_endpoint: None,
                http3: false,
            }
        );
    }
}
