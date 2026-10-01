import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🚀 MANTRA CORS WAJIB BUAT MOBILE/APK
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    // 1. Tarik profil pasien SEKALIGUS narik data Appointment & DischargeSummary (RM 14)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        patientProfile: {
          include: {
            appointments: true,
            dischargeSummary: true, // <--- INI KUNCI BIAR DATA RM 14 KETARIK
          },
        },
      },
    });

    if (!user?.patientProfile) {
      return NextResponse.json(
        { error: "Not Found" },
        { status: 404, headers: corsHeaders },
      );
    }

    let jadwal: any[] = [];

    // 2. Masukin data jadwal dari tabel Appointment (kalau ada dari Prisma Studio)
    if (
      user.patientProfile.appointments &&
      user.patientProfile.appointments.length > 0
    ) {
      jadwal = [...user.patientProfile.appointments];
    }

    // 3. 🚀 LOGIKA SAKTI: Sinkronisasi Form RM 14 ke Jadwal Kontrol
    const rm14 = user.patientProfile.dischargeSummary;
    if (rm14 && rm14.jadwalKontrol) {
      jadwal.push({
        id: rm14.id + "_rm14", // ID Unik biar gak bentrok
        date: rm14.jadwalKontrol,

        // 🛡️ Logika Fallback Sakti buat Poli/Department
        department: rm14.tempatKontrol || "Lokasi Belum Ditentukan",

        // 🛡️ Logika Fallback Sakti buat Nama Dokter
        doctorName: rm14.namaDokter || "Sesuai Jadwal Dokter Jaga",

        // 🛡️ Lokasi fisik kontrol
        location: rm14.tempatKontrol || "Gedung Rawat Jalan / Poliklinik",

        notes: "Instruksi kontrol pasca rawat inap (Form RM 14)",
        status: "SCHEDULED", // Otomatis terkonfirmasi
      });
    }

    // 4. Urutkan jadwal dari tanggal yang paling dekat
    jadwal.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // 🚀 RETURN PAKE CORS HEADERS
    return NextResponse.json(jadwal, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[KONTROL_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
