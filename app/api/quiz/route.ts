import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 🚀 MANTRA CORS: Wajib ada biar Frontend nggak diblokir pas nembak API beda URL
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Nanganin Preflight Request CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ========================================================
// 1. FUNGSI POST: SIMPAN SKOR KUIS DARI HP PASIEN
// ========================================================
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 🚀 Ambil jawaban dari frontend (Nangkep patientId juga)
    const body = await req.json();
    const { patientId, category, score } = body;

    if (!patientId || !category || score === undefined) {
      return new NextResponse("Data kuis tidak lengkap", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 🚀 Cari ID Pasien pakai patientId yang dilempar Frontend (MED-XXX)
    const patientRecord = await prisma.patientProfile.findUnique({
      where: { qrCodeData: patientId },
    });

    if (!patientRecord) {
      return new NextResponse("Data Pasien tidak ditemukan", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // 🚀 FITUR ANTI-SPAM (COOLDOWN SYSTEM) - DIUBAH JADI 5 MENIT
    // ========================================================
    const JEDA_WAKTU_MENIT = 5; // 👈 Jeda 5 Menit

    // 1. Cari riwayat kuis terakhir pasien ini
    const lastQuiz = await prisma.quizResult.findFirst({
      where: {
        patientId: patientRecord.id,
        category: category, // Cek di kategori kuis yang sama
      },
      orderBy: {
        createdAt: "desc", // Ambil yang paling baru
      },
    });

    // 2. Kalau dia pernah ngerjain, kita hitung selisih waktunya
    if (lastQuiz) {
      const waktuSekarang = new Date();
      const waktuTerakhir = new Date(lastQuiz.createdAt);

      // Rumus ngitung selisih waktu dalam hitungan MENIT (dibagi 60000 ms)
      const selisihMenit =
        Math.abs(waktuSekarang.getTime() - waktuTerakhir.getTime()) / 60000;

      // 3. Kalau belum lewat masa jeda 5 menit, TOLAK mentah-mentah!
      if (selisihMenit < JEDA_WAKTU_MENIT) {
        const sisaWaktu = Math.ceil(JEDA_WAKTU_MENIT - selisihMenit);
        return new NextResponse(
          `Gagal: Tunggu ${sisaWaktu} menit lagi untuk mengisi kuis ini.`,
          {
            status: 429, // 429 = Too Many Requests
            headers: corsHeaders,
          },
        );
      }
    }
    // ========================================================

    // Simpan ke database (Tabel QuizResult)
    const newQuizResult = await prisma.quizResult.create({
      data: {
        patientId: patientRecord.id,
        category: category,
        score: Number(score),
      },
    });

    return NextResponse.json(
      {
        message: "Skor berhasil disimpan!",
        data: newQuizResult,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[KUIS_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// ========================================================
// 2. FUNGSI GET: TARIK SEMUA SKOR BUAT DASHBOARD ADMIN
// ========================================================
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Tarik semua hasil kuis, urutkan dari yang terbaru
    const quizResults = await prisma.quizResult.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(quizResults, { headers: corsHeaders });
  } catch (error) {
    console.error("[KUIS_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
