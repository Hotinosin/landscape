export default {
  editor: {
    title: "编辑 PPPD 服务",
    create_title: "新建 PPPD 配置",
    attach_iface: "拨号网卡",
    default_route: "设置默认路由",
    ppp_iface_name: "ppp网口名称",
    iface_required: "网卡名称不能为空",
    iface_invalid_format:
      "PPPoE 网卡名称只能包含字母、数字、-、_，长度不超过 15，且不能有首尾空白",
    iface_same_as_attach: "PPPoE 网卡名称不能与拨号网卡相同",
    iface_conflict_existing: "PPPoE 网卡名称不能与现有网卡重名",
    username: "用户名",
    password: "密码",
    ac_name: "AC 名称",
    ac_name_tip:
      "没有特殊需求请留空，否则可能导致拨号异常。设置后只会连接 AC 名称一致的服务端。",
    plugin: "PPPoE 插件",
  },
  status_not_dialed: "未成功拨号",
  status_disabled: "未启用",
  attach_to: "拨号网卡: {iface_name}",
  service_locked_hint: "拨通后可用",
};
