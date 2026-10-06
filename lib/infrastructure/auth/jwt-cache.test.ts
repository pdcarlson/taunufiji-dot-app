import { createJWTCache, JWT_REUSE_MS } from "./jwt-cache";

describe("createJWTCache", () => {
  it("reuses a token until the reuse window passes", async () => {
    let clock = 0;
    let n = 0;
    const mint = vi.fn(async () => `jwt-${++n}`);
    const cache = createJWTCache(mint, () => clock);

    expect(await cache.get()).toBe("jwt-1");
    clock = JWT_REUSE_MS - 1;
    expect(await cache.get()).toBe("jwt-1");
    expect(mint).toHaveBeenCalledTimes(1);

    clock = JWT_REUSE_MS;
    expect(await cache.get()).toBe("jwt-2");
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it("shares one mint between concurrent callers", async () => {
    const mint = vi.fn(async () => "jwt");
    const cache = createJWTCache(mint, () => 0);

    const tokens = await Promise.all([cache.get(), cache.get(), cache.get()]);

    expect(tokens).toEqual(["jwt", "jwt", "jwt"]);
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("mints again after clear", async () => {
    let n = 0;
    const mint = vi.fn(async () => `jwt-${++n}`);
    const cache = createJWTCache(mint, () => 0);

    await cache.get();
    cache.clear();

    expect(await cache.get()).toBe("jwt-2");
  });

  it("does not cache a failed mint", async () => {
    const mint = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockResolvedValueOnce("jwt");
    const cache = createJWTCache(mint, () => 0);

    await expect(cache.get()).rejects.toThrow("rate limited");
    expect(await cache.get()).toBe("jwt");
  });
});
