export default {
  service_edit: {
    title: "Firewall",
  },
  blacklist_edit: {
    title: "Firewall Blacklist Editor",
    name: "Name",
    name_placeholder: "Enter name",
    remark: "Remark",
    remark_placeholder: "Enter remark",
    source: "Blacklist Source",
    source_type_ip: "IP address",
    source_type_geo: "GeoIP database",
    add_source: "Add source",
    block_all_tip: "This will block access from all IP addresses",
    geo_key_required: "Source #{index}: GeoIP key is required",
    ip_required: "Source #{index}: IP address is required",
  },
  blacklist_card: {
    no_source_rules: "No source rules. No effect.",
  },
  card: {
    title: "Firewall",
    ip_blacklist_desc:
      "Currently configured as IP blacklist. Matched IPs will be blocked. ICMP is not allowed by default.",
  },
};
