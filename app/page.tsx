"use client";

import { useState } from "react";
import { getDeviceId } from "@/lib/deviceId";

const KATEGORI_OPTIONS = [
  "Khutbah Jumat",
  "Kultum Subuh",
  "Ceramah Peringatan Hari Besar Islam",
  "Sambutan Acara Sekolah",
  "Pidato Perpisahan",
];

interface GenerateResponse {
  konten?: string;
  provider?: "groq" | "gemini";
  remaining?: number;
  error?: string;
}

export default function HomePage() {
  const [kategori, setKategori] = useState(KATEGORI_OPTIONS[0]);
  const [tema, setTema] = useState("");
  const [durasi, setDurasi] = useState(10);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tema.trim()) {
      setError("Isi dulu tema pidatonya ya.");
      return;
    }

    setLoading(true);
    setError(null);
    setHasil(null);

    try {
      const res = await fetch("/api/generate-pidato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori,
          tema,
          durasi,
          deviceId: getDeviceId(),
        }),
      });

      const data: GenerateResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Naskah gagal dibuat. Coba lagi.");
        return;
      }

      setHasil(data.konten ?? null);
      setProvider(data.provider ?? null);
      setRemaining(data.remaining ?? null);
    } catch {
      setError("Koneksi bermasalah. Cek internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (hasil) navigator.clipboard.writeText(hasil);
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      {/* Hero */}
      <header className="max-w-xl mx-auto mb-8">
        <div className="brutal-card relative px-6 py-8 sm:px-8 sm:py-10">
          <span className="brutal-badge absolute -top-4 left-6 px-3 py-1 text-xs uppercase inline-block">
            MBS Tanggul
          </span>
          <h1 className="font-display text-4xl sm:text-5xl mt-2">
            PIDATOMU
          </h1>
          <p className="mt-3 text-sm sm:text-base font-medium">
            Naskah khutbah, kultum, dan pidato islami — siap dalam hitungan
            detik, bukan berjam-jam begadang.
          </p>
        </div>
      </header>

      {/* Form */}
      <section className="max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="brutal-card p-6 sm:p-8 space-y-6">
          <div>
            <label
              htmlFor="kategori"
              className="block text-xs font-bold uppercase tracking-wide mb-2"
            >
              Jenis kegiatan
            </label>
            <select
              id="kategori"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="brutal-input w-full px-3 py-2.5 text-sm font-medium"
            >
              {KATEGORI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tema"
              className="block text-xs font-bold uppercase tracking-wide mb-2"
            >
              Tema pidato
            </label>
            <input
              id="tema"
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Contoh: pentingnya menuntut ilmu"
              className="brutal-input w-full px-3 py-2.5 text-sm font-medium placeholder:text-black/40"
            />
          </div>

          <div>
            <label
              htmlFor="durasi"
              className="block text-xs font-bold uppercase tracking-wide mb-2"
            >
              Durasi: {durasi} menit
            </label>
            <input
              id="durasi"
              type="range"
              min={3}
              max={30}
              step={1}
              value={durasi}
              onChange={(e) => setDurasi(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="brutal-btn w-full py-3 text-sm"
          >
            {loading ? "Sedang menyusun naskah..." : "Buat naskah →"}
          </button>

          {error && (
            <p className="text-sm font-medium border-[3px] border-[var(--color-ink)] bg-[var(--color-danger)]/20 px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </section>

      {/* Hasil */}
      {hasil && (
        <section className="max-w-xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">NASKAHMU</h2>
            <button
              onClick={handleCopy}
              className="brutal-btn bg-[var(--color-accent-2)] px-3 py-1.5 text-xs"
            >
              Salin
            </button>
          </div>

          <article className="brutal-card whitespace-pre-wrap p-6 text-sm leading-relaxed">
            {hasil}
          </article>

          <p className="mt-3 text-xs font-medium">
            Dibuat dengan {provider === "groq" ? "Groq" : "Gemini"}
            {remaining !== null && ` · sisa kuota hari ini: ${remaining}`}
          </p>
        </section>
      )}
    </main>
  );
}
