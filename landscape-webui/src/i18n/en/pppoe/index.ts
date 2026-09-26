export default {
  editor: {
    title: "Edit PPPD Service",
    create_title: "New PPPD Config",
    attach_iface: "Dial Interface",
    default_route: "Set as Default Route",
    ppp_iface_name: "PPP Interface Name",
    iface_required: "Interface name is required",
    iface_invalid_format:
      "PPPoE interface names may only use letters, digits, '-' and '_', must be 15 characters or fewer, and cannot have leading or trailing whitespace",
    iface_same_as_attach:
      "PPPoE interface name cannot be the same as the dial interface",
    iface_conflict_existing:
      "PPPoE interface name cannot conflict with an existing interface",
    username: "Username",
    password: "Password",
    ac_name: "AC Name",
    ac_name_tip:
      "Leave empty unless required. When set, only servers with a matching AC name are used and dialing may otherwise fail.",
    plugin: "PPPoE Plugin",
  },
  status_not_dialed: "Dial not established",
  status_disabled: "Disabled",
  attach_to: "dial via {iface_name}",
  service_locked_hint: "Available after dial-up",
};
