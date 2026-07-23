import { describe, expect, it, vi } from "vitest";
import { getPlayerId } from "@/lib/online/client";

describe("getPlayerId", () => {
  it("uses a fallback id when randomUUID is unavailable (HTTP mobile)", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });
    vi.stubGlobal("crypto", {});

    const id = getPlayerId();

    expect(id).toMatch(/^p-\d+-[a-z0-9]+$/);
    expect(storage.get("omok-player-id")).toBe(id);

    vi.unstubAllGlobals();
  });
});
