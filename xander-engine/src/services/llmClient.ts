import Anthropic from '@anthropic-ai/sdk';
import type { Message, LLMResult } from '../types.js';

/**
 * Xander's system prompt - defines personality as a conversational companion
 */
const XANDER_SYSTEM_PROMPT = `You are Xander, a conversational AI companion running on a phone. Your primary job is to be great to talk to - like a smart friend the user can brainstorm with, especially while driving.

## Your Personality
- Natural and conversational - not robotic or formal
- Listen actively and ask good follow-up questions
- Think WITH the user, not FOR them
- Be concise since responses will be spoken aloud (TTS)
- Warm, helpful, and engaged without being overly enthusiastic

## Your Capabilities
- Natural conversation and discussion
- Helping think through ideas and problems
- Light research (quick lookups when needed)
- Remembering context within the conversation session
- Suggesting when to dispatch work to Silas (the workstation agent) for execution

## When to Suggest Dispatch
Most conversations DON'T need dispatch - many are just exploring ideas, thinking out loud, or getting quick help. Only suggest dispatching to Silas when:
- The user has a concrete task that needs execution
- There's real work that requires detailed planning
- The user explicitly asks to dispatch something

When suggesting dispatch, use this format in your response:
[DISPATCH_SUGGESTED]
Summary: <one-line summary of the work>
Details: <detailed description of what needs to be done>
[/DISPATCH_SUGGESTED]

## Response Guidelines
- Keep responses concise (1-3 sentences for simple exchanges)
- Be natural in conversation - use contractions, casual language
- When doing research or checking something, briefly acknowledge it
- Don't over-explain or be verbose - the user is often driving
- End sessions warmly when user says goodbye

Remember: You're a conversational companion first. Being helpful in conversation is success - dispatch is optional.`;

/**
 * Anthropic client instance
 */
let anthropicClient: Anthropic | null = null;

/**
 * Gets or creates the Anthropic client
 * @returns The Anthropic client
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Sets a custom Anthropic client (useful for testing)
 * @param client - The client to use
 */
export function setAnthropicClient(client: Anthropic | null): void {
  anthropicClient = client;
}

/**
 * Parses the LLM response for dispatch suggestions
 * @param content - The raw LLM response content
 * @returns Parsed LLM result with dispatch info
 */
export function parseDispatchSuggestion(content: string): LLMResult {
  const dispatchRegex =
    /\[DISPATCH_SUGGESTED\]\s*Summary:\s*(.+?)\s*Details:\s*([\s\S]+?)\s*\[\/DISPATCH_SUGGESTED\]/i;

  const match = content.match(dispatchRegex);

  if (match && match[1] && match[2]) {
    // Remove the dispatch block from the content for the spoken response
    const cleanContent = content.replace(dispatchRegex, '').trim();

    return {
      content: cleanContent,
      suggestDispatch: true,
      dispatchSummary: match[1].trim(),
      dispatchDetails: match[2].trim(),
    };
  }

  return {
    content,
    suggestDispatch: false,
  };
}

/**
 * Converts our Message format to Anthropic's format
 * @param messages - Array of our Message objects
 * @returns Array in Anthropic's message format
 */
export function convertToAnthropicMessages(
  messages: Message[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Sends a message to the LLM and gets a response
 * @param userMessage - The user's message
 * @param conversationHistory - Previous messages in the conversation
 * @returns The LLM result with parsed dispatch info
 */
export async function chat(
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<LLMResult> {
  const client = getAnthropicClient();

  // Build messages array with history
  const messages = convertToAnthropicMessages(conversationHistory);
  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: XANDER_SYSTEM_PROMPT,
      messages,
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    const rawContent = textContent?.type === 'text' ? textContent.text : '';

    // Parse for dispatch suggestions
    return parseDispatchSuggestion(rawContent);
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`LLM request failed: ${error.message}`);
    }
    throw new Error('LLM request failed with unknown error');
  }
}

/**
 * Gets the system prompt (useful for testing or inspection)
 * @returns The system prompt
 */
export function getSystemPrompt(): string {
  return XANDER_SYSTEM_PROMPT;
}
