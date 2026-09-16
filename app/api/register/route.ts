import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/app/libs/api";
import { registerSchema } from "@/app/libs/schemas";

export async function POST(req: Request) {
  const parsed = await parseJson(req, registerSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { email, password, name } = parsed.data;

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return apiError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
      );
    }

    return apiError(500, "INTERNAL_ERROR", "Unable to create account.");
  }
}
