import { describe, it, expect } from "vitest";
import { DockerContainerSummary } from "./index";

describe("DockerContainerSummary IP and Ports enrichment", () => {
  it("extracts and deduplicates IP addresses from NetworkSettings", () => {
    const container = new DockerContainerSummary({
      Names: ["/my-web"],
      State: "running" as any,
      NetworkSettings: {
        Networks: {
          bridge: {
            IPAddress: "172.17.0.2",
            GlobalIPv6Address: "2001:db8::1",
          },
          custom_net: {
            IPAddress: "192.168.10.5",
          },
        },
      },
    });

    const ips = container.getIpAddresses();
    expect(ips).toEqual(["172.17.0.2", "2001:db8::1", "192.168.10.5"]);
  });

  it("handles empty or missing NetworkSettings safely", () => {
    const container = new DockerContainerSummary({
      Names: ["/empty-net"],
    });

    expect(container.getIpAddresses()).toEqual([]);
  });

  it("formats port mappings cleanly and deduplicates 0.0.0.0 and ::", () => {
    const container = new DockerContainerSummary({
      Names: ["/web-server"],
      Ports: [
        {
          IP: "0.0.0.0",
          PublicPort: 8080,
          PrivatePort: 80,
          Type: "tcp",
        },
        {
          IP: "::",
          PublicPort: 8080,
          PrivatePort: 80,
          Type: "tcp",
        },
        {
          IP: "127.0.0.1",
          PublicPort: 8443,
          PrivatePort: 443,
          Type: "tcp",
        },
        {
          PrivatePort: 53,
          Type: "udp",
        },
      ],
    });

    const formatted = container.formatPorts();
    // 0.0.0.0 and :: are deduped to "8080->80/tcp"
    expect(formatted).toEqual([
      "8080->80/tcp",
      "127.0.0.1:8443->443/tcp",
      "53/udp",
    ]);
  });

  it("supports lower_case/camelCase raw JSON from backend", () => {
    const rawData = {
      names: ["/casing-test"],
      ports: [
        {
          ip: "0.0.0.0",
          public_port: 9000,
          private_port: 9000,
          type: "tcp",
        },
      ],
      network_settings: {
        networks: {
          eth0: {
            ip_address: "10.0.0.2",
          },
        },
      },
    };

    const container = new DockerContainerSummary(rawData as any);
    expect(container.getIpAddresses()).toEqual(["10.0.0.2"]);
    expect(container.formatPorts()).toEqual(["9000->9000/tcp"]);
  });
});
