import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

const runWorker = async (request) => {
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
};

describe("Avatar worker", () => {
  it("rechaza métodos distintos de POST", async () => {
    const request = new Request("https://worker.test/api/edit-avatar", {
      method: "GET",
    });
    const response = await runWorker(request);
    expect(response.status).toBe(405);
  });

  it("valida que la imagen base esté presente en modo edición", async () => {
    env.GOOGLE_AI_KEY = "dummy-key";
    const request = new Request("https://worker.test/api/edit-avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "edit" }),
    });
    const response = await runWorker(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error).toMatch(/image/i);
  });
});
