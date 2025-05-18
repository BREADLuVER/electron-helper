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
      1. Read through the question, filenames, and instructions carefully, identify coding language, initial code, testing code, and test cases
      2. Explain your understanding of the question (1 sentence), ask a scope question if possible.
      3. Provide your approach so interviewer can verify our approach, follow these steps
        • Think out loud: describe the goal, what component/hook/HOC will be created in order, what file/folder should we create (if necessary), and where it belongs in the repository (if necessary).
        • Example: "So for pagination first we'll need how many users we want to show per page — like 5, 10, or 20 — and add a dropdown for that. Then we’ll figure out how many pages we need total, based on how many users we have. we’ll set up buttons for going to the next or previous page, and make sure they don’t go out of bounds. And finally, we’ll make sure the table updates whenever you change the page or the number of users to show. No new files are needed, we’ll just add this to the existing table component."
      4. Then carefully write clean correct code, like if the coding environment is typeScript, use type annotations so there's no error.
      5. When writing code, comment HEAVILY like you're narrating while coding. Explain key parts and decision points, focusing on what is created, what is returned, what is rendered, and how data flows.
      6. Ensure the solution strictly adheres to required output formats and constraints given by test cases or problem specifications.

      If asked about follow-ups or provided error messages intended for debugging
      1. First, figure out what the error message means and what could cause it.
      2. Point out the specific part of the code that’s likely broken.
      3. Use real-world reasoning before providing full fixed code: console logs, variable checks, common mistakes (please provide where to look or add).
      4. Provide fixed code. You need to mark the code changes in the code, and explain what you are doing.`
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
