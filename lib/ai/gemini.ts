export class GeminiError extends Error {}

interface GenerateParams {
  kategori: string;
  tema: string;
  durasi: number;
  systemPrompt: string;
}

export async function generateWithGemini({
  kategori,
  tema,
  durasi,
  systemPrompt,
}: GenerateParams): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Buatkan naskah untuk kategori "${kategori}" dengan tema "${tema}", durasi sekitar ${durasi} menit.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new GeminiError("Gemini API tidak mengembalikan konten");
  }

  return content as string;
}
