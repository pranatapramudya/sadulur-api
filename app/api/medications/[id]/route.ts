import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Perhatikan di Next.js 15, params itu bentuknya Promise
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // FIX UTAMA: Kita harus 'await' params-nya dulu sebelum ambil ID-nya!
    const resolvedParams = await params;
    const idObat = resolvedParams.id;

    const body = await req.json();
    const { isTaken } = body;

    // Update status obat di database
    const updatedMed = await prisma.medication.update({
      where: { id: idObat },
      data: { isTaken },
    });

    return NextResponse.json(updatedMed);
  } catch (error) {
    console.error("[MEDICATION_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
