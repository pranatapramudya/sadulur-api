import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mantra CORS wajib biar aman nembak dari Frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { checkinId, message, emergencyNumber } = body;

    // Validasi data kosong
    if (!checkinId || !message) {
      return new NextResponse("Data tidak lengkap", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 🚀 LOGIKA SAKTI: Update data keluhan pasien di database
    const updatedCheckin = await prisma.dailyCheckIn.update({
      where: { id: checkinId }, // Cari ID keluhan yang mau dibalas
      data: {
        adminReply: message, // Masukin pesan dokter
        emergencyContact: emergencyNumber || null, // Masukin no darurat (kalau ada)
        isHandled: true, // Otomatis tandai "Beres" karena udah dibalas!
      },
    });

    return NextResponse.json(
      { message: "Balasan sukses dikirim!", data: updatedCheckin },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("[REPLY_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
