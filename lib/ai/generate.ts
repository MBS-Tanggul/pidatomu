import { generateWithGroq, GroqError } from "./groq";
import { generateWithGemini, GeminiError } from "./gemini";

const SYSTEM_PROMPT = `Kamu adalah penulis naskah pidato/ceramah/khutbah berbahasa Indonesia
yang islami, natural, dan enak dibaca saat disampaikan lisan. Sertakan pembuka
(salam, muqaddimah, puji syukur), isi yang runtut sesuai tema, dan penutup
(kesimpulan, doa, salam penutup). Gunakan bahasa yang sesuai konteks pesantren/sekolah
Islam, sopan, dan tidak kaku.`;

export interface GenerateResult {
  konten: string;
  provider: "groq" | "gemini";
}

export async function generateNaskahPidato(params: {
  kategori: string;
  tema: string;
  durasi: number;
}): Promise<GenerateResult> {
  const input = { ...params, systemPrompt: SYSTEM_PROMPT };

  try {
    const konten = await generateWithGroq(input);
    return { konten, provider: "groq" };
  } catch (err) {
    if (!(err instanceof GroqError)) throw err;
    console.warn("[generate] Groq gagal, fallback ke Gemini:", err.message);
  }

  try {
    const konten = await generateWithGemini(input);
    return { konten, provider: "gemini" };
  } catch (err) {
    if (err instanceof GeminiError) {
      throw new Error(
        "Kedua penyedia AI (Groq & Gemini) gagal merespons. Coba lagi sebentar lagi."
      );
    }
    throw err;
  }
}