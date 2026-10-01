import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    // 1. Convert Clerk ID jadi format MED-XXXXXX (qrCodeData)
    const qrCodeData = `MED-${userId.split("_")[1]?.substring(0, 6).toUpperCase()}`;

    // 2. Cari profil pasien pakai qrCodeData
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { qrCodeData },
    });

    if (!patientProfile) {
      return NextResponse.json([]); // Balikin array kosong kalau belum ada data
    }

    // 3. Tarik semua obat khusus buat pasien ini
    const medications = await prisma.medication.findMany({
      where: { patientId: patientProfile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(medications);
  } catch (error) {
    console.error("[MEDICATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
