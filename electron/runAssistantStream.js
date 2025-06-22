"use strict";
import { OpenAI } from "openai";
import { config } from "./config.js";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const threadCache = new Map(); // assistantId -> threadId

/**
 * Stream tokens from an Assistant run.
 * @param {string} assistantId
 * @param {object} userContent – message object ({role, content})
 * @param {(token: string)=>void} onToken – callback per text token
 * @returns {Promise<string>} full assistant answer
 */
export async function runAssistantStream(assistantId, userContent, onToken) {
  // 1) get / create thread
  let threadId = threadCache.get(assistantId);
  if (!threadId) {
    const { id } = await openai.beta.threads.create();
    threadId = id;
    threadCache.set(assistantId, threadId);
  }
  // 2) push user message onto thread
  await openai.beta.threads.messages.create(threadId, userContent);
  // 3) start streaming run
  const BIG_PAIR_PROGRAMMING_PROMPT = `
  you are a helpful assistant that can answer questions and help with tasks.
  `;
  const runArgs = { assistant_id: assistantId, stream: true };
  if (assistantId === config.FRONTEND_ASSISTANT_ID) {
    runArgs.instructions = BIG_PAIR_PROGRAMMING_PROMPT;
  }
  const stream = await openai.beta.threads.runs.create(threadId, runArgs);
  let full = "";
  for await (const event of stream) {
    if (
      event.event === "thread.message.delta" &&
      event.data?.delta?.content?.length &&
      event.data.delta.content[0].text?.value
    ) {
      const piece = event.data.delta.content[0].text.value;
      full += piece;
      onToken(piece);
    }
  }
  return full;
}
