import { vi } from "vitest";

/**
 * Stand-in for the Prisma singleton exported by `app/libs/prismadb`.
 * Test files wire it up with:
 *
 *   vi.mock("@/app/libs/prismadb", async () => ({
 *     default: (await import("../helpers/prisma")).prismaMock,
 *   }));
 */
export const prismaMock = {
  $transaction: vi.fn(
    async (callback: (transaction: typeof prismaMock) => unknown) =>
      callback(prismaMock),
  ),
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  listing: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  reservation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  availabilityDay: {
    createMany: vi.fn(),
  },
};
