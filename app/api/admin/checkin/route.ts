import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // Pastikan path ini sesuai dengan folder prisma lu

// Matikan cache biar real-time
export const dynamic = "force-dynamic";

// Tambahin Header CORS biar nggak diblokir browser, WAJIB ADA PUT!
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS", // <-- PUT udah ditambahin
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// === 1. TARIK DATA KE TABEL ADMIN (SINKRON DENGAN RM 14) ===
export async function GET() {
  try {
    // Tarik data checkin + RELASI KE PATIENT DAN USER
    const checkins = await prisma.dailyCheckIn.findMany({
      orderBy: { date: "desc" },
      include: {
        patient: {
          include: {
            user: true, // 🚀 Bikin nama "Alvin" muncul, bukan "Pasien Aplikasi"
            dischargeSummary: true, // 🚀 Bikin data RM 14 sinkron & link PDF tembus
          },
        },
      },
    });

    console.log("✅ DATA ADMIN SINKRON:", checkins.length, "laporan");
    return NextResponse.json(checkins, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ GAGAL TARIK DATA ADMIN:", error);
    return NextResponse.json(
      { error: "Gagal narik data dari database" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// === 2. FUNGSI UNTUK TOMBOL "TANDAI BERES" ===
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, isHandled } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID laporan tidak ditemukan!" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Update status di database jadi selesai
    const updatedCheckin = await prisma.dailyCheckIn.update({
      where: { id: id },
      data: { isHandled: isHandled },
    });

    return NextResponse.json(
      {
        message: "Status penanganan berhasil diperbarui",
        data: updatedCheckin,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("❌ GAGAL UPDATE STATUS:", error);
    return NextResponse.json(
      { error: "Gagal update status penanganan" },
      { status: 500, headers: corsHeaders },
    );
  }
}
