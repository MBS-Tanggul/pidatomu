import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkAndIncrementRateLimit } from "@/lib/rateLimit";
import { generateNaskahPidato } from "@/lib/ai/generate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kategori, tema, durasi, deviceId } = body;

    if (!kategori || !tema || !durasi) {
      return NextResponse.json(
        { error: "kategori, tema, dan durasi wajib diisi" },
        { status: 400 }
      );
    }

    // --- Tentukan owner: user login (dari Supabase Auth cookie) atau guest (device_id)
    const supabase = createServiceClient();
    const authHeader = req.headers.get("authorization");
    let owner: { type: "guest" | "user"; ref: string };

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (user) {
        owner = { type: "user", ref: user.id };
      } else {
        owner = { type: "guest", ref: deviceId ?? "unknown" };
      }
    } else {
      if (!deviceId) {
        return NextResponse.json(
          { error: "deviceId wajib diisi untuk guest" },
          { status: 400 }
        );
      }
      owner = { type: "guest", ref: deviceId };
    }

    // --- Cek rate limit
    const rl = await checkAndIncrementRateLimit(owner);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Batas ${rl.limit} naskah/hari sudah tercapai. Coba lagi besok${
            owner.type === "guest" ? ", atau login untuk kuota lebih besar." : "."
          }`,
        },
        { status: 429 }
      );
    }

    // --- Generate naskah (Groq → fallback Gemini)
    const { konten, provider } = await generateNaskahPidato({
      kategori,
      tema,
      durasi,
    });

    // --- Simpan ke histori
    const { data: saved, error: insertError } = await supabase
      .from("speeches")
      .insert({
        owner_type: owner.type,
        owner_ref: owner.ref,
        kategori,
        tema,
        durasi,
        konten,
        ai_provider: provider,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generate-pidato] gagal simpan histori:", insertError.message);
      // Tetap return hasil ke user meski gagal simpan, jangan bikin mereka rugi
    }

    return NextResponse.json({
      konten,
      provider,
      remaining: rl.limit - rl.currentCount,
      speechId: saved?.id ?? null,
    });
  } catch (err) {
    console.error("[generate-pidato] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat naskah. Coba lagi." },
      { status: 500 }
    );
  }
}