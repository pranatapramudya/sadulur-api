import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { qrCodeData } = body;

    if (!qrCodeData) return new NextResponse("QR Code kosong", { status: 400 });

    // CEK DULU: Pasiennya udah ada belum?
    const existingPatient = await prisma.patientProfile.findUnique({
      where: { qrCodeData },
    });

    if (existingPatient) {
      return NextResponse.json({
        message: "Aman bre! Pasien udah ada di database.",
        patient: existingPatient,
      });
    }

    const dummyUser = await prisma.user.create({
      data: {
        clerkId: `dummy_${Date.now()}`,
        email: `pasien_${Date.now()}@test.com`,
        name: "Pranata Pramudya (Pasien Test)",
        role: "PATIENT",
      },
    });

    const newPatient = await prisma.patientProfile.create({
      data: {
        userId: dummyUser.id,
        qrCodeData: qrCodeData,
        medicalSpecs: "Gol Darah: O, Alergi: Amoxicillin",
      },
    });

    return NextResponse.json({
      message: "Pasien berhasil disinkron",
      patient: newPatient,
    });
  } catch (error) {
    console.error("[SYNC_QR_ERROR]", error);
    return new NextResponse("Gagal sinkron data", { status: 500 });
  }
}
