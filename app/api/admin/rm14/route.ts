import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🚀 MANTRA CORS: Biar Frontend lu nggak diblokir pas narik data (Public Scan QR)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 🚀 WAJIB ADA: Buat nanganin "Preflight Request" dari browser sebelum narik data
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId)
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });

    const body = await req.json();
    const {
      patientId,
      namaPasien, // Nangkep input nama dari form
      diagnosaMedis,
      tindakanDiberikan,
      instruksiAktivitas,
      aturanDiet,
      perawatanRumah,
      tanggalPulang,
      jadwalKontrol,
      tempatKontrol,
      namaDokter,
      medications,
      // Nangkep sisa variabel form panjang
      ruangan,
      namaPerawat,
      jenisAktifitas,
      perubahanPosisi,
      eliminasi,
      alatBantu,
      tandaGejala,
      pengobatanDiRumah,
      anjuranMakan,
      batasanMakanan,
      nomorDarurat,
    } = body;

    if (!patientId)
      return new NextResponse("ID Pasien tidak ditemukan", {
        status: 400,
        headers: corsHeaders,
      });

    let patientRecord = await prisma.patientProfile.findUnique({
      where: { qrCodeData: patientId },
      include: { user: true },
    });

    let generatedAccount = null;

    // === 1. LOGIKA BIKIN AKUN OTOMATIS ===
    if (!patientRecord) {
      const client = await clerkClient();
      const email = `pasien_${patientId.replace("-", "").toLowerCase()}@sadulur.com`;
      const password = `Sadulur123!`;

      // Bikin akun di keamanan Clerk
      const clerkUser = await client.users.createUser({
        emailAddress: [email],
        password: password,
        firstName: namaPasien || "Pasien",
        lastName: patientId,
      });

      // 🚀 [TAMBAHAN HACK] Paksa email langsung "Verified" biar ga kena OTP
      if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
        const primaryEmailId = clerkUser.emailAddresses[0].id;
        await client.emailAddresses.updateEmailAddress(primaryEmailId, {
          verified: true,
        });
      }

      // Simpan identitas ke Database
      const dbUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email,
          name: namaPasien || "Pasien Baru",
          role: "PATIENT",
        },
      });

      patientRecord = await prisma.patientProfile.create({
        data: { userId: dbUser.id, qrCodeData: patientId },
        include: { user: true },
      });

      generatedAccount = { email, password };
    } else if (namaPasien && patientRecord.user?.name !== namaPasien) {
      // Update nama kalau diedit perawat
      await prisma.user.update({
        where: { id: patientRecord.userId },
        data: { name: namaPasien },
      });
    }

    // === 2. SIMPAN DOKUMEN RM14 (Fungsi Edit ada di sini dengan upsert) ===
    const gabunganAktivitas =
      instruksiAktivitas ||
      `${jenisAktifitas || ""} ${perubahanPosisi || ""} ${eliminasi || ""} ${alatBantu || ""}`;
    const gabunganPerawatan =
      perawatanRumah ||
      `${tandaGejala || ""} ${pengobatanDiRumah || ""} Darurat:${nomorDarurat || ""}`;
    const gabunganDiet =
      aturanDiet || `${anjuranMakan || ""} ${batasanMakanan || ""}`;

    const safeTanggalPulang = tanggalPulang
      ? new Date(tanggalPulang)
      : new Date();
    const safeJadwalKontrol = jadwalKontrol ? new Date(jadwalKontrol) : null;

    const dischargeSummary = await prisma.dischargeSummary.upsert({
      where: { patientId: patientRecord.id },
      update: {
        diagnosaMedis,
        tindakanDiberikan,
        instruksiAktivitas: gabunganAktivitas,
        aturanDiet: gabunganDiet,
        perawatanRumah: gabunganPerawatan,
        tanggalPulang: safeTanggalPulang,
        jadwalKontrol: safeJadwalKontrol,
        tempatKontrol,
        namaDokter,
      },
      create: {
        patientId: patientRecord.id,
        diagnosaMedis,
        tindakanDiberikan,
        instruksiAktivitas: gabunganAktivitas,
        aturanDiet: gabunganDiet,
        perawatanRumah: gabunganPerawatan,
        tanggalPulang: safeTanggalPulang,
        jadwalKontrol: safeJadwalKontrol,
        tempatKontrol,
        namaDokter,
      },
    });

    if (medications && Array.isArray(medications)) {
      await prisma.medication.deleteMany({
        where: { dischargeSummaryId: dischargeSummary.id },
      });
      const medsData = medications
        .filter((m: any) => m.name !== "")
        .map((med: any) => ({
          patientId: patientRecord.id,
          dischargeSummaryId: dischargeSummary.id,
          name: med.name,
          dosage: med.dosage || "",
          rules: med.rules || "",
          timeToTake: med.timeToTake || "",
        }));
      if (medsData.length > 0)
        await prisma.medication.createMany({ data: medsData });
    }

    return NextResponse.json(
      {
        message: "Sukses",
        dischargeSummary,
        generatedAccount,
      },
      { headers: corsHeaders },
    ); // 🚀 Tambah headers CORS di POST
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// === 3. LOGIKA NARIK HISTORY PASIEN (100% PUBLIC BYPASS) ===
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId"); // Tangkap ID yang di-klik

    if (!patientId) {
      return NextResponse.json(
        { error: "ID Pasien tidak valid" },
        { status: 400, headers: corsHeaders },
      );
    }

    const patientRecord = await prisma.patientProfile.findUnique({
      where: { qrCodeData: patientId },
      include: {
        user: true,
        dischargeSummary: { include: { medications: true } },
      },
    });

    // Kalau data pasien nggak ada di database, balikin error 404 bukan null, biar jelas statusnya
    if (!patientRecord) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan!" },
        { status: 404, headers: corsHeaders },
      );
    }

    // 🚀 Berhasil dapet data, kirim respon dibalut CORS biar Frontend bisa ngebaca
    return NextResponse.json(patientRecord, { headers: corsHeaders });
  } catch (error) {
    console.error("Error GET RM14:", error);
    return new NextResponse("Internal Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
