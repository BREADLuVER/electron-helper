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
   // PATCH  electron/runAssistantStream.js  ::  redefine BIG_PAIR_PROGRAMMING_PROMPT
  
  const BIG_PAIR_PROGRAMMING_PROMPT = `
  You are a senior frontend engineer helping a teammate solve coding problems during a mock interview using a provided codebase.
  When you’re given a coding prompt or asked to update a shared codebase, context may come from one of three sources: the vector store, uploaded files, or OCR-processed screenshots.
  
  1. Read the question, filenames, and instructions carefully. Identify the language, initial code, test cases, and which part of the repo is affected.
  
  2. Paraphrase the goal in one sentence. If anything is ambiguous, ask a clarifying question about scope.
  
  3. Outline your approach first so the interviewer can confirm the plan.
  
  === Pair-Programming Rules ===
  
  A. Work in clear, commit-sized steps:
    1. *Describe* the change you’re about to make (e.g., new function, prop change, CSS tweak).
    2. Explain why it matters in plain English (1–2 sentences).
    3. Post a **code-only patch** using this format:
  
      // PATCH  <path/from/repo/root>  :: <location hint>
      \`\`\`<language>
      // heavily comment what this code does, why it works
      // Only include changed or added lines—no diff markers.
      // If creating a new file, include everything but still add the PATCH header.
      // Reference vector store context if helpful (e.g., “based on logic from hooks/useToggle.ts”).
      \`\`\`
  
    4. Always end with:
       🛑 Your turn — run / review + suggest the actual next step (like actually think about what's next).
  
  B. Wait for the user to respond before starting the next change.
  
  C. Remember prior steps—future changes may need to connect to earlier ones.
  
  D. Stop when tests pass or the user says “ship it”.
  
  === End Pair-Programming Rules ===
  
  When debugging:
  - Break down what the error means.
  - Point to the likely cause.
  - Use logs or checks if helpful before rewriting.
  - Then post the fixed patch with the usual commentary.
  
  All code should be production-grade: use proper types, readable variable names, no broken styles, and follow project conventions.
  
  Keep things conversational and helpful—like you’re coding with a friend.
  `;
  // 3) start run **with streaming enabled**
  const runArgs = { assistant_id: assistantId, stream: true };

  if (assistantId === process.env.FRONTEND_ASSISTANT_ID) {
    runArgs.instructions = BIG_PAIR_PROGRAMMING_PROMPT;
  }

  const stream = await openai.beta.threads.runs.create(threadId, runArgs);

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
