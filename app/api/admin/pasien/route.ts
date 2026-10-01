import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Langsung panggil Prisma di sini biar ga error path import
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Tarik semua akun PATIENT beserta profil dan data RM14-nya
    const users = await prisma.user.findMany({
      where: { role: "PATIENT" },
      orderBy: { createdAt: "desc" },
      include: {
        patientProfile: {
          include: {
            dischargeSummary: true, // <--- INI KUNCINYA BIAR FRONTEND BISA BACA STATUS
          },
        },
      },
    });

    // Format data biar cocok sama tabel Frontend lu
    const formattedData = users.map((u: any) => ({
      id: u.id,
      qrCodeData:
        u.patientProfile?.qrCodeData ||
        `MED-${u.id.split("_")[1]?.substring(0, 6).toUpperCase() || u.id.substring(0, 6).toUpperCase()}`,
      user: {
        name: u.name,
        email: u.email,
      },
      // Bawa status RM 14 nya ke tabel admin!
      dischargeSummary: u.patientProfile?.dischargeSummary || null,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error narik pasien:", error);
    return NextResponse.json(
      { error: "Gagal narik data pasien" },
      { status: 500 },
    );
  }
}
