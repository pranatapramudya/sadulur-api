import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { auth } from "@clerk/nextjs/server"; // Tambahan wajib buat keamanan PUT

// Matikan cache biar real-time
export const dynamic = "force-dynamic";

// Tambahin Header CORS biar nggak diblokir browser (Include PUT)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// === 1. FUNGSI NARIK DATA LAPORAN (SUDAH DI-FILTER KHUSUS PASIEN LOGIN) ===
export async function GET(req: Request) {
  try {
    // 🚀 1. Nangkep identitas/ID Clerk dari pasien yang lagi buka aplikasi
    const { userId } = await auth();

    // Kalau nggak ada yang login, tendang!
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Silakan login terlebih dahulu" },
        { status: 401, headers: corsHeaders },
      );
    }

    // 🚀 2. Tarik data dari database HANYA UNTUK PASIEN INI SAJA
    const checkins = await prisma.dailyCheckIn.findMany({
      where: {
        patient: {
          user: {
            clerkId: userId, // Filter ajaib: Cocokin ID database dengan ID Clerk
          },
        },
      },
      orderBy: { date: "desc" },
      include: {
        patient: {
          include: {
            user: true,
            dischargeSummary: true,
          },
        },
      },
    });

    console.log(
      `✅ DATA PASIEN ${userId} DITEMUKAN:`,
      checkins.length,
      "laporan",
    );

    return NextResponse.json(checkins, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("❌ GAGAL TARIK DATA:", error);
    return NextResponse.json(
      { error: "Gagal narik data dari database" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// === 2. FUNGSI BARU BUAT UPDATE STATUS TICKETING (TANDAI BERES) ===
export async function PUT(req: Request) {
  try {
    // Keamanan: Cek apakah yang ngeklik beneran admin/perawat yang login
    const { userId } = await auth();
    if (!userId)
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });

    const body = await req.json();
    const { id, isHandled } = body;

    if (!id)
      return new NextResponse("ID laporan tidak ditemukan", {
        status: 400,
        headers: corsHeaders,
      });

    // Update status penanganan di database PostgreSQL / Supabase
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
    console.error("❌ [CHECKIN_PUT] ERROR:", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// === 3. FUNGSI NERIMA DATA CHECK-IN BARU DARI PASIEN ===
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { painScale, hasFever, tookMedicine, symptoms, patientId } = body;

    // Cek kalau ID pasien kosong
    if (!patientId) {
      return NextResponse.json(
        { error: "ID Pasien tidak ditemukan!" },
        { status: 400, headers: corsHeaders },
      );
    }

    // 🚀 LOGIKA BARU: Cari profile pasien di DB pakai MED-XXXX (qrCodeData)
    // GANTI findUnique JADI findFirst BIAR LEBIH AMAN DARI ERROR PRISMA
    const patientRecord = await prisma.patientProfile.findFirst({
      where: { qrCodeData: patientId },
    });

    if (!patientRecord) {
      return NextResponse.json(
        { error: "Data Pasien tidak terdaftar di database!" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Masukin data keluhan ke database Prisma pake ID asli dari database
    const newCheckin = await prisma.dailyCheckIn.create({
      data: {
        painScale: Number(painScale),
        hasFever: Boolean(hasFever),
        tookMedicine: Boolean(tookMedicine),
        symptoms: String(symptoms || ""),
        patientId: patientRecord.id, // 🚀 UDAH DIGANTI PAKE ID ASLI DATABASE
        date: new Date(),
        isHandled: false, // Default pasti belum ditangani
      },
    });

    return NextResponse.json(
      { message: "Sukses tersimpan!", data: newCheckin },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    console.error("❌ [CHECKIN_POST] ERROR:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data ke database server" },
      { status: 500, headers: corsHeaders },
    );
  }
}
