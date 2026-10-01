import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// API Public (Tanpa Clerk Auth) buat dibaca dokter dari scan QR
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const clerkId = params.id;

    // 1. Tarik data medis dari Prisma
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      include: {
        patientProfile: {
          include: {
            dischargeSummary: {
              include: {
                medications: true,
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      !user.patientProfile ||
      !user.patientProfile.dischargeSummary
    ) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 2. TRIK OTOMATIS: Tarik nama asli langsung dari Server Clerk
    let realName = user.name;
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkId);

      // Gabungkan First Name & Last Name dari Clerk
      if (clerkUser) {
        const fullName =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
        if (fullName) {
          realName = fullName;
        }
      }
    } catch (clerkErr) {
      console.error("[CLERK_FETCH_ERROR] Gagal narik nama:", clerkErr);
    }

    // 3. Kirim data lengkap ke Frontend
    return NextResponse.json({
      name: realName, // <--- Sekarang ngirim nama asli dari Clerk!
      email: user.email,
      rmData: user.patientProfile.dischargeSummary,
      medsData: user.patientProfile.dischargeSummary.medications || [],
    });
  } catch (error) {
    console.error("[PUBLIC_RM14_GET_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
