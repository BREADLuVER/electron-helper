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
    { assistant_id: assistantId, instructions: `
      If provided a general coding question
      1. Read through the question and instructions carefully, identify initial code, testing code, or test cases
      2. Explain your understanding of the question
      3. Provide your approach so interviewer can verify our approach, follow these steps
        • Think out loud: “Here’s what I assume, here’s what I’ll build, here’s roughly how.”
        • Describe the goal, what component/hook/HOC will be created, what will be returned, what file/folder should we create (if necessary), and where it belongs in the repository (if necessary).
      4. Then write clean, readable code with explicit return statements and clear inline comments that focus on: when async logic runs, how props/state are used, and what is returned/rendered

      If asked about follow-ups or provided error messages intended for debugging
      1. First, figure out what the error message means and what could cause it.
      2. Point out the specific part of the code that’s likely broken.
      3. Suggest practical fixes and explain why they would work.
      Use real-world reasoning: console logs, variable checks, common mistakes. Don’t rewrite the whole thing unless you have to.`
      , stream: true }
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
