import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAxiosInstance } from "@landscape-router/types/mutator";
import { get_runtime_ip_addresses } from "./network";

const mockAxios = vi.fn();

describe("get_runtime_ip_addresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAxiosInstance(mockAxios as any);
  });

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
    mockAxios.mockResolvedValue({ data: addresses });

    await expect(get_runtime_ip_addresses()).resolves.toEqual(addresses);
    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/v1/services/ip/runtime-addresses",
        method: "GET",
      }),
    );
  });
});

