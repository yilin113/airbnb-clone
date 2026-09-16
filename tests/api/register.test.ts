// @vitest-environment node
import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/register/route";
import { makeUser } from "../helpers/factories";
import { prismaMock } from "../helpers/prisma";

vi.mock("bcrypt", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock("@/app/libs/prismadb", async () => ({
  default: (await import("../helpers/prisma")).prismaMock,
}));

const mockedBcrypt = vi.mocked(bcrypt);

beforeEach(() => {
  prismaMock.user.create.mockReset();
  mockedBcrypt.hash.mockReset();
});

describe("POST /api/register", () => {
  it("hashes the password and stores the user", async () => {
    const user = makeUser();
    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    mockedBcrypt.hash.mockImplementation((() =>
      Promise.resolve("hashed-pw")) as unknown as typeof bcrypt.hash);
    prismaMock.user.create.mockResolvedValue(publicUser);

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "  ADA@EXAMPLE.COM ",
          password: "secret-123",
          name: "  Ada Lovelace  ",
        }),
      }),
    );

    expect(mockedBcrypt.hash).toHaveBeenCalledWith("secret-123", 12);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "ada@example.com",
        hashedPassword: "hashed-pw",
        name: "Ada Lovelace",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody).toMatchObject({ id: user.id });
    expect(responseBody).not.toHaveProperty("hashedPassword");
  });

  it("rejects invalid input before hashing", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "not-an-email",
          password: "short",
          name: "A",
        }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
    });
    expect(mockedBcrypt.hash).not.toHaveBeenCalled();
  });

  it("returns a conflict for a duplicate email", async () => {
    mockedBcrypt.hash.mockImplementation((() =>
      Promise.resolve("hashed-pw")) as unknown as typeof bcrypt.hash);
    prismaMock.user.create.mockRejectedValue({ code: "P2002" });

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "ada@example.com",
          password: "secret-123",
          name: "Ada Lovelace",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists.",
      },
    });
  });

  it("does not expose unexpected account creation errors", async () => {
    mockedBcrypt.hash.mockImplementation((() =>
      Promise.resolve("hashed-pw")) as unknown as typeof bcrypt.hash);
    prismaMock.user.create.mockRejectedValue(new Error("database details"));

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "ada@example.com",
          password: "secret-123",
          name: "Ada Lovelace",
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to create account.",
      },
    });
  });
});
