export class GroqError extends Error {}

interface GenerateParams {
  kategori: string;
  tema: string;
  durasi: number;
  systemPrompt: string;
}

export async function generateWithGroq({
  kategori,
  tema,
  durasi,
  systemPrompt,
}: GenerateParams): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Buatkan naskah untuk kategori "${kategori}" dengan tema "${tema}", durasi sekitar ${durasi} menit.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
    // Groq bisa lambat kalau lagi rame; kasih timeout eksplisit
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GroqError(`Groq API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new GroqError("Groq API tidak mengembalikan konten");
  }

  return content as string;
}
