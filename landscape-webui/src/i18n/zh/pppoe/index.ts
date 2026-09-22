export default {
  editor: {
    title: "编辑 PPPD 服务",
    default_route: "默认路由",
    ppp_iface_name: "PPP 接口名称",
    iface_required: "网卡名称不能为空",
    iface_invalid_format:
      "PPPoE 网卡名称只能包含字母、数字、-、_，长度不超过 15，且不能有首尾空白",
    iface_same_as_attach: "PPPoE 网卡名称不能与挂载网卡相同",
    iface_conflict_existing: "PPPoE 网卡名称不能与现有网卡重名",
    username: "用户名",
    password: "密码",
    ac_name: "AC 名称",
    ac_name_tip:
      "没有特殊需求请留空，否则可能导致拨号异常。设置后只会连接 AC 名称一致的服务端。",
    plugin: "PPPoE 插件",
  },
  pppd_card: {
    interface_label: "网卡: {iface_name}",
    attach_interface: "附着网卡",
  },
  pppd_drawer: {
    configure_pppd: "配置 {iface_name} PPPD 服务",
    add_pppd: "添加 PPPD 配置",
  },
};
