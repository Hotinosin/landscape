import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("axios", () => ({ default: { create: vi.fn() } }));
vi.mock("@/api", () => ({
  applyInterceptors: () => ({ get: mocks.get }),
}));

import { get_runtime_ip_addresses } from "./network";

describe("get_runtime_ip_addresses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unwraps the Landscape API response", async () => {
    const addresses = {
      eno1: [
        {
          address: "192.168.10.229",
          prefix_length: 24,
          is_permanent: false,
        },
      ],
    };
    mocks.get.mockResolvedValue({ data: addresses });

    await expect(get_runtime_ip_addresses()).resolves.toEqual(addresses);
  });
});
