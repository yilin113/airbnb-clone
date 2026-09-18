// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ai/listing-description/route";
import { makeUser } from "../helpers/factories";

const getCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@/app/actions/getCurrentUser", () => ({ default: getCurrentUser }));

const body = {
  title: "新宿安靜長住公寓",
  description: "距離車站步行五分鐘，有穩定網路、廚房及洗衣機，適合遠端工作。",
  locationLabel: "新宿站，東京都・新宿區",
  stationWalkMinutes: 5,
  roomCount: 1,
  bathroomCount: 1,
  guestCount: 2,
};

function request(payload: unknown = body) {
  return new Request("http://localhost/api/ai/listing-description", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  getCurrentUser.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("OPENAI_API_KEY", "");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/ai/listing-description", () => {
  it("requires a signed-in host", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
  });

  it("validates the host-provided facts", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(request({ ...body, description: "太短" }));

    expect(response.status).toBe(422);
  });

  it("explains when the optional AI service is not configured", async () => {
    getCurrentUser.mockResolvedValue(makeUser());

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AI_UNAVAILABLE" },
    });
  });

  it("returns a Traditional Chinese draft without storing the response", async () => {
    getCurrentUser.mockResolvedValue(makeUser());
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { type: "output_text", text: "這是一份整理後的繁體中文房源介紹。" },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const response = await POST(request());

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      }),
    );
    const options = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      model: "test-model",
      store: false,
    });
    await expect(response.json()).resolves.toEqual({
      description: "這是一份整理後的繁體中文房源介紹。",
    });
  });
});
