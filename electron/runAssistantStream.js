// assistants.js                 (keep runAssistant() unchanged)
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const threadCache = new Map();          // assistantId  →  threadId

/**
 * Stream tokens from an Assistant run.
 * @param {string}   assistantId   – OpenAI Assistant ID
 * @param {object}   userContent   – message object ({role, content})
 * @param {func}     onToken       – called with each text token
 * @returns {Promise<string>}      – full assistant answer once complete
 */
export async function runAssistantStream(
  assistantId,
  userContent,
  onToken
) {
  // 1) thread
  let threadId = threadCache.get(assistantId);
  if (!threadId) {
    const { id } = await openai.beta.threads.create();
    threadId = id;
    threadCache.set(assistantId, threadId);
  }

  // 2) add user message to thread
  await openai.beta.threads.messages.create(threadId, userContent);

  // 3) start run **with streaming enabled**
  /* 2025-04 SDK:   runs.create({ …, stream:true }) supersedes
     the deprecated runs.createAndStream()                                   */
  const stream = await openai.beta.threads.runs.create(
    threadId,
    { assistant_id: assistantId, stream: true }
  );

  let full = "";

  for await (const event of stream) {
    /* events include deltas for both metadata and message tokens.
       We only care about message deltas containing text.               */
    if (
      event.event === "thread.message.delta" &&
      event.data.delta?.content?.length &&
      event.data.delta.content[0].text?.value
    ) {
      const piece = event.data.delta.content[0].text.value;
      full += piece;
      onToken(piece);                 // hand token back to caller
    }
  }

  return full;
}
