import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. FUNGSI GET: Buat narik semua daftar video edukasi
export async function GET() {
  try {
    const modules = await prisma.educationModule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(modules);
  } catch (error) {
    console.error("[EDUKASI_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// 2. FUNGSI POST: Buat nambah video baru
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { title, mediaUrl, category } = body;

    // CEK AMAN: Pastikan akun admin/perawat terdaftar di tabel User lokal
    // Biar Prisma nggak ngambek nyari "authorId"
    let adminUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `perawat_${Date.now()}@sadulur.com`, // Email dummy darurat
          name: "Perawat Sadulur",
          role: "NURSE",
        },
      });
    }

    // Simpan data video ke database
    const newModule = await prisma.educationModule.create({
      data: {
        title,
        mediaUrl, // Link YouTube
        content: "Video Edukasi SadulurCare",
        type: "VIDEO",
        category: category, // Sesuai Enum: RING_JANTUNG, GULA_DIABETES, dll
        authorId: adminUser.id,
      },
    });

    return NextResponse.json(newModule);
  } catch (error) {
    console.error("[EDUKASI_POST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// 3. FUNGSI DELETE: Buat hapus video kalau salah masukin
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new NextResponse("ID tidak ditemukan", { status: 400 });

    await prisma.educationModule.delete({ where: { id } });
    return NextResponse.json({ message: "Video dihapus" });
  } catch (error) {
    console.error("[EDUKASI_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
