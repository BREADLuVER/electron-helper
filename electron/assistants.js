// assistants.js  (new file, keep code clean in main.js)
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- cache one thread per assistant per app session ---
const threadCache = new Map();   // assistantId -> threadId

export async function runAssistant(assistantId, userContent) {
  // 1) ensure we have a thread
  let threadId = threadCache.get(assistantId);
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
    threadCache.set(assistantId, threadId);
  }

  // 2) post the user message
  await openai.beta.threads.messages.create(threadId, userContent);

  // 3) launch a run
  let run = await openai.beta.threads.runs.create(
    threadId,                                   // ▲ positional arg #1
    { assistant_id: assistantId }               // ▲ positional arg #2
  );

  // 4) simple polling loop (could be websocket instead)
  while (run.status !== "completed") {
    await new Promise(r => setTimeout(r, 500));
    run = await openai.beta.threads.runs.retrieve(
      threadId,                                 // ▲
      run.id
    );
  }
  // 5) grab the assistant’s last message
  const msgs = await openai.beta.threads.messages.list(threadId, { limit: 1 });
  return msgs.data[0].content[0].text.value;
}
