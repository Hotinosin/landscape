import { useThemeVars } from "naive-ui";

export const LAND_REDIRECT_ID_KEY = "ld_flow_edge";

export interface DockerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type?: string;
}

export interface DockerNetworkEndpoint {
  IPAddress?: string;
  IPPrefixLen?: number;
  Gateway?: string;
  GlobalIPv6Address?: string;
  GlobalIPv6PrefixLen?: number;
  MacAddress?: string;
}

export interface DockerNetworkSettings {
  Networks?: Record<string, DockerNetworkEndpoint>;
}

export class DockerContainerSummary {
  Id: string | undefined;
  Created: number | undefined;
  Names: string[] | undefined;
  State: DockerContainerStatus | undefined;
  Image: string | undefined;
  Ports: DockerPort[] | undefined;
  NetworkSettings: DockerNetworkSettings | undefined;

  constructor(obj?: {
    Id?: string;
    Created?: number;
    Names?: string[];
    State?: DockerContainerStatus;
    Image?: string;
    Ports?: DockerPort[];
    NetworkSettings?: DockerNetworkSettings;
  }) {
    const raw = obj as any;
    this.Id = obj?.Id ?? raw?.id;
    this.Created = obj?.Created ?? raw?.created;
    this.Names = obj?.Names ?? raw?.names;
    this.State = obj?.State ?? raw?.state;
    this.Image = obj?.Image ?? raw?.image;
    this.Ports = obj?.Ports ?? raw?.ports;
    this.NetworkSettings =
      obj?.NetworkSettings ?? raw?.network_settings ?? raw?.networkSettings;
  }

  get_color() {
    const themeVars = useThemeVars();
    return this.State === DockerContainerStatus.running
      ? themeVars.value.successColor
      : "";
  }

  getIpAddresses(): string[] {
    const networks =
      this.NetworkSettings?.Networks ??
      (this.NetworkSettings as any)?.networks;
    if (!networks) return [];
    const seen = new Set<string>();
    const ips: string[] = [];
    for (const net of Object.values(networks) as any[]) {
      const ipv4 = net?.IPAddress ?? net?.ip_address ?? net?.ipAddress;
      if (ipv4 && typeof ipv4 === "string" && !seen.has(ipv4)) {
        seen.add(ipv4);
        ips.push(ipv4);
      }
      const ipv6 =
        net?.GlobalIPv6Address ??
        net?.global_ipv6_address ??
        net?.globalIpv6Address;
      if (ipv6 && typeof ipv6 === "string" && !seen.has(ipv6)) {
        seen.add(ipv6);
        ips.push(ipv6);
      }
    }
    return ips;
  }

  formatPorts(): string[] {
    if (!this.Ports || this.Ports.length === 0) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of this.Ports as any[]) {
      const typ = raw?.Type ?? raw?.type ?? "tcp";
      const proto = typ ? `/${typ}` : "";
      const priv =
        raw?.PrivatePort ?? raw?.private_port ?? raw?.privatePort;
      const pub =
        raw?.PublicPort ?? raw?.public_port ?? raw?.publicPort;
      const ip = raw?.IP ?? raw?.ip;
      let formatted: string;
      if (pub != null) {
        if (ip && ip !== "0.0.0.0" && ip !== "::") {
          formatted = `${ip}:${pub}->${priv}${proto}`;
        } else {
          formatted = `${pub}->${priv}${proto}`;
        }
      } else if (priv != null) {
        formatted = `${priv}${proto}`;
      } else {
        continue;
      }
      if (!seen.has(formatted)) {
        seen.add(formatted);
        result.push(formatted);
      }
    }
    return result;
  }
}

export class DockerImageSummary {
  Id: string;
  Created: number | undefined;
  Labels: Map<string, string> | undefined;
  RepoTags: string[] | undefined;
  Size: number | undefined;
  constructor(obj?: {
    Id: string;
    Created?: number;
    Labels?: any | undefined;
    RepoTags: string[];
    Size: number | undefined;
  }) {
    this.Id = obj?.Id ?? "";
    this.Created = obj?.Created;
    this.RepoTags = obj?.RepoTags;
    this.Size = obj?.Size;
    if (obj?.Labels !== undefined) {
      let map = new Map<string, string>();
      for (const [key, value] of Object.entries(obj?.Labels)) {
        map.set(key, value as string);
      }
      this.Labels = map;
    }
  }
}

export enum DockerContainerStatus {
  created = "created",
  restarting = "restarting",
  running = "running",
  removing = "removing",
  paused = "paused",
  exited = "exited",
  dead = "dead",
}

export class DockerBtnShow {
  start: boolean;
  stop: boolean;
  pause: boolean;
  unpause: boolean;
  remove: boolean;

  constructor(status: DockerContainerStatus | undefined) {
    this.start = false;
    this.stop = false;
    this.pause = false;
    this.unpause = false;
    this.remove = true;
    // 根据不同的状态设置按钮显示
    switch (status) {
      case DockerContainerStatus.created:
        this.start = true; // 容器是 created 时，可以启动
        this.remove = true; // 可以删除容器
        break;

      case DockerContainerStatus.running:
        this.stop = true; // 容器运行中时，可以停止
        this.pause = true; // 可以暂停容器
        this.remove = true; // 可以删除容器
        break;

      case DockerContainerStatus.paused:
        this.unpause = true; // 容器暂停时，可以恢复
        this.stop = true; // 也可以停止
        this.remove = true; // 可以删除容器
        break;

      case DockerContainerStatus.exited:
        this.start = true; // 容器停止后，可以重启
        this.remove = true; // 可以删除容器
        break;

      case DockerContainerStatus.restarting:
        this.stop = true; // 容器重启中时，可以停止
        this.remove = true; // 可以删除容器
        break;

      case DockerContainerStatus.dead:
        this.remove = true; // 死亡状态下，唯一可操作的就是删除
        break;

      case DockerContainerStatus.removing:
        // 容器在移除状态下，没有任何操作按钮
        this.remove = false; // 容器正在移除中，没有其他操作
        break;
    }
  }
}

// export class HealthConfig {
//   Test: string[] | undefined;
//   Interval: number | undefined;
//   Timeout: number | undefined;
//   Retries: number | undefined;
//   StartPeriod: number | undefined;
//   StartInterval: number | undefined;

//   constructor(obj?: {
//     Test?: string[];
//     Interval?: number;
//     Timeout?: number;
//     Retries?: number;
//     StartPeriod?: number;
//     StartInterval?: number;
//   }) {
//     this.Test = obj?.Test;
//     this.Interval = obj?.Interval;
//     this.Timeout = obj?.Timeout;
//     this.Retries = obj?.Retries;
//     this.StartPeriod = obj?.StartPeriod;
//     this.StartInterval = obj?.StartInterval;
//   }
// }

// export class EndpointSettings {
//   IPAMConfig: EndpointIpamConfig | undefined;
//   Links: string[] | undefined;
//   MacAddress: string | undefined;
//   Aliases: string[] | undefined;
//   DriverOpts: Map<string, string> | undefined;
//   NetworkID: string | undefined;
//   EndpointID: string | undefined;
//   Gateway: string | undefined;
//   IPAddress: string | undefined;
//   IPPrefixLen: number | undefined;
//   IPv6Gateway: string | undefined;
//   GlobalIPv6Address: string | undefined;
//   GlobalIPv6PrefixLen: number | undefined;
//   DNSNames: string[] | undefined;

//   constructor(obj?: {
//     IPAMConfig?: EndpointIpamConfig;
//     Links?: string[];
//     MacAddress?: string;
//     Aliases?: string[];
//     DriverOpts?: Record<string, string>;
//     NetworkID?: string;
//     EndpointID?: string;
//     Gateway?: string;
//     IPAddress?: string;
//     IPPrefixLen?: number;
//     IPv6Gateway?: string;
//     GlobalIPv6Address?: string;
//     GlobalIPv6PrefixLen?: number;
//     DNSNames?: string[];
//   }) {
//     this.IPAMConfig = obj?.IPAMConfig;
//     this.Links = obj?.Links;
//     this.MacAddress = obj?.MacAddress;
//     this.Aliases = obj?.Aliases;

//     if (obj?.DriverOpts) {
//       this.DriverOpts = new Map(Object.entries(obj.DriverOpts));
//     }

//     this.NetworkID = obj?.NetworkID;
//     this.EndpointID = obj?.EndpointID;
//     this.Gateway = obj?.Gateway;
//     this.IPAddress = obj?.IPAddress;
//     this.IPPrefixLen = obj?.IPPrefixLen;
//     this.IPv6Gateway = obj?.IPv6Gateway;
//     this.GlobalIPv6Address = obj?.GlobalIPv6Address;
//     this.GlobalIPv6PrefixLen = obj?.GlobalIPv6PrefixLen;
//     this.DNSNames = obj?.DNSNames;
//   }
// }

// export class NetworkingConfig {
//   EndpointsConfig: Map<string, EndpointSettings> | undefined;

//   constructor(obj?: { EndpointsConfig?: Record<string, EndpointSettings> }) {
//     if (obj?.EndpointsConfig) {
//       this.EndpointsConfig = new Map<string, EndpointSettings>(
//         Object.entries(obj.EndpointsConfig) as [string, EndpointSettings][]
//       );
//     }
//   }
// }

// export class DockerRunConfig {
//   Hostname: string | undefined;
//   Domainname: string | undefined;
//   User: string | undefined;
//   AttachStdin: boolean | undefined;
//   AttachStdout: boolean | undefined;
//   AttachStderr: boolean | undefined;
//   ExposedPorts: Map<string, Map<any, any>> | undefined;
//   Tty: boolean | undefined;
//   OpenStdin: boolean | undefined;
//   StdinOnce: boolean | undefined;
//   Env: string[] | undefined;
//   Cmd: string[] | undefined;
//   Healthcheck: HealthConfig | undefined;
//   ArgsEscaped: boolean | undefined;
//   Image: string | undefined;
//   Volumes: Map<string, Map<any, any>> | undefined;
//   WorkingDir: string | undefined;
//   Entrypoint: string[] | undefined;
//   NetworkDisabled: boolean | undefined;
//   MacAddress: string | undefined;
//   OnBuild: string[] | undefined;
//   Labels: Map<string, string> | undefined;
//   StopSignal: string | undefined;
//   StopTimeout: number | undefined;
//   Shell: string[] | undefined;
//   // HostConfig: HostConfig | undefined;
//   NetworkingConfig: NetworkingConfig | undefined;

//   constructor(obj?: {
//     Hostname?: string;
//     Domainname?: string;
//     User?: string;
//     AttachStdin?: boolean;
//     AttachStdout?: boolean;
//     AttachStderr?: boolean;
//     ExposedPorts?: Record<string, Record<any, any>>;
//     Tty?: boolean;
//     OpenStdin?: boolean;
//     StdinOnce?: boolean;
//     Env?: string[];
//     Cmd?: string[];
//     Healthcheck?: HealthConfig;
//     ArgsEscaped?: boolean;
//     Image?: string;
//     Volumes?: Record<string, Record<any, any>>;
//     WorkingDir?: string;
//     Entrypoint?: string[];
//     NetworkDisabled?: boolean;
//     MacAddress?: string;
//     OnBuild?: string[];
//     Labels?: Record<string, string>;
//     StopSignal?: string;
//     StopTimeout?: number;
//     Shell?: string[];
//     // HostConfig?: HostConfig;
//     NetworkingConfig?: NetworkingConfig;
//   }) {
//     this.Hostname = obj?.Hostname;
//     this.Domainname = obj?.Domainname;
//     this.User = obj?.User;
//     this.AttachStdin = obj?.AttachStdin;
//     this.AttachStdout = obj?.AttachStdout;
//     this.AttachStderr = obj?.AttachStderr;

//     if (obj?.ExposedPorts) {
//       this.ExposedPorts = new Map(
//         Object.entries(obj.ExposedPorts) as [string, Map<any, any>][]
//       );
//     }

//     this.Tty = obj?.Tty;
//     this.OpenStdin = obj?.OpenStdin;
//     this.StdinOnce = obj?.StdinOnce;
//     this.Env = obj?.Env;
//     this.Cmd = obj?.Cmd;
//     this.Healthcheck = obj?.Healthcheck;
//     this.ArgsEscaped = obj?.ArgsEscaped;
//     this.Image = obj?.Image;

//     if (obj?.Volumes) {
//       this.Volumes = new Map(
//         Object.entries(obj.Volumes) as [string, Map<any, any>][]
//       );
//     }

//     this.WorkingDir = obj?.WorkingDir;
//     this.Entrypoint = obj?.Entrypoint;
//     this.NetworkDisabled = obj?.NetworkDisabled;
//     this.MacAddress = obj?.MacAddress;
//     this.OnBuild = obj?.OnBuild;

//     if (obj?.Labels) {
//       this.Labels = new Map(Object.entries(obj.Labels) as [string, string][]);
//     }

//     this.StopSignal = obj?.StopSignal;
//     this.StopTimeout = obj?.StopTimeout;
//     this.Shell = obj?.Shell;
//     // this.HostConfig = obj?.HostConfig;
//     this.NetworkingConfig = obj?.NetworkingConfig;
//   }
// }

// export class EndpointIpamConfig {
//   IPv4Address: string | undefined;
//   IPv6Address: string | undefined;
//   LinkLocalIPs: string[] | undefined;

//   constructor(obj?: {
//     IPv4Address?: string;
//     IPv6Address?: string;
//     LinkLocalIPs?: string[];
//   }) {
//     this.IPv4Address = obj?.IPv4Address;
//     this.IPv6Address = obj?.IPv6Address;
//     this.LinkLocalIPs = obj?.LinkLocalIPs;
//   }
// }
