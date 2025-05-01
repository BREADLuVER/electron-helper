// runAssistant.js  (put next to main.js; explicit returns for clarity)
import { OpenAI } from "openai";
const openai = new OpenAI();

export default async function runAssistantStream({ model, messages, onToken }) {
  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,     // ← magic flag :contentReference[oaicite:0]{index=0}
  });

  let full = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0].delta.content || "";
    if (!token) continue;
    full += token;
    onToken(token);   // hand each piece to caller
  }
  return full;        // caller still gets the whole answer at the end
};
