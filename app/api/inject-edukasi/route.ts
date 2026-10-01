import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // KODE PINTAR: Cari otomatis User pertama di database
    const user = await prisma.user.findFirst();

    if (!user) {
      return NextResponse.json(
        { error: "Belum ada user di database nih!" },
        { status: 400 },
      );
    }

    // 1. Suntik Data Video (Otomatis pakai ID dari user yang ketemu)
    await prisma.educationModule.create({
      data: {
        title: "Cara Merawat Luka Pasca Operasi",
        content: "Panduan visual langkah demi langkah merawat luka di rumah.",
        mediaUrl: "https://www.youtube.com/watch?v=123456789",
        type: "VIDEO",
        authorId: user.id, // <-- OTOMATIS NGAMBIL ID LU YANG BENAR
      },
    });

    // 2. Suntik Data Artikel
    await prisma.educationModule.create({
      data: {
        title: "Pentingnya Minum Obat Teratur",
        content: "Penjelasan medis mengapa obat harus diminum tepat waktu.",
        mediaUrl: "https://www.halodoc.com",
        type: "ARTICLE",
        authorId: user.id, // <-- OTOMATIS NGAMBIL ID LU YANG BENAR
      },
    });

    return NextResponse.json({
      message: "BOOM! Data Edukasi Berhasil Disuntik ke Database tanpa error!",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
