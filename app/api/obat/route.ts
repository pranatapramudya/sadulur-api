import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // Sesuai path yang jalan tadi

// FUNGSI TARIK DATA (Yang udah ada)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { patientProfile: true },
    });

    if (!user?.patientProfile) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan" },
        { status: 404 },
      );
    }

    const medications = await prisma.medication.findMany({
      where: { patientId: user.patientProfile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(medications, { status: 200 });
  } catch (error) {
    console.error("Error fetching medications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// FUNGSI BARU: BUAT UPDATE OBAT JADI "SUDAH DIMINUM"
export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id)
      return NextResponse.json({ error: "ID Obat tidak ada" }, { status: 400 });

    // Ambil waktu lokal jam & menit sekarang
    const now = new Date();
    const timeString = now.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta", // INI KUNCINYA BIAR JADI WIB
      hour: "2-digit",
      minute: "2-digit",
    });

    // Update status di database Neon DB
    const updatedObat = await prisma.medication.update({
      where: { id },
      data: {
        isTaken: true,
        timeToTake: timeString, // Otomatis simpan jam diklik
      },
    });

    return NextResponse.json(updatedObat, { status: 200 });
  } catch (error) {
    console.error("Error updating medication:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
