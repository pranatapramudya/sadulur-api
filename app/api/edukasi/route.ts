import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const modules = await prisma.educationModule.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(modules, { status: 200 });
  } catch (error) {
    console.error("Error fetching education modules:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
