import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/services/api";

describe("api service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends selected tags on finalize", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ sessionId: "S1", summary: "ok", tags: ["A"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await api.finalizeResearchSession("S1", ["TagA", "TagB"]);

    const call = fetchSpy.mock.calls[0];
    expect(call).toBeTruthy();
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("\"tags\":[\"TagA\",\"TagB\"]");
  });

  it("builds paged history request with multi categories", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, limit: 12, total: 0, totalPages: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await api.getResearchHistoryPaged({ categories: ["AI", "Finance"], page: 2, limit: 12 });

    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("/research/history/paged?");
    expect(url).toContain("category=AI%2CFinance");
    expect(url).toContain("page=2");
  });
});
