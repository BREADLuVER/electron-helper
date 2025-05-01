import { OpenAI } from "openai";
const openai = new OpenAI();

async function runAssistantStream({ assistantId, threadId, userMessage, onToken }) {
  await openai.beta.threads.messages.create(threadId, userMessage);

  const stream = await openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId,
  });

  let full = "";
  for await (const chunk of stream) {
    const token = chunk?.choices?.[0]?.delta?.content || "";
    if (!token) continue;
    full += token;
    onToken(token);
  }
  return full;
}

export default runAssistantStream; // Use ES module export