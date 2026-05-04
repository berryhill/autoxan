import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseDispatchSuggestion,
  convertToAnthropicMessages,
  getSystemPrompt,
  chat,
  setAnthropicClient,
  getAnthropicClient,
} from '../services/llmClient.js';
import type { Message } from '../types.js';

describe('llmClient', () => {
  beforeEach(() => {
    // Reset the client before each test
    setAnthropicClient(null);
  });

  afterEach(() => {
    // Reset the client after each test
    setAnthropicClient(null);
    vi.unstubAllEnvs();
  });

  describe('parseDispatchSuggestion', () => {
    it('returns suggestDispatch false when no dispatch block present', () => {
      const content = 'Hello! How can I help you today?';
      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(false);
      expect(result.content).toBe(content);
      expect(result.dispatchSummary).toBeUndefined();
      expect(result.dispatchDetails).toBeUndefined();
    });

    it('parses dispatch suggestion correctly', () => {
      const content = `Sure, I can help with that. Let me dispatch this to Silas.

[DISPATCH_SUGGESTED]
Summary: Create push notification system
Details: Implement a notification service using Firebase Cloud Messaging. Include user preference settings and a scheduler for timed notifications.
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(true);
      expect(result.dispatchSummary).toBe('Create push notification system');
      expect(result.dispatchDetails).toContain('Firebase Cloud Messaging');
      expect(result.content).not.toContain('[DISPATCH_SUGGESTED]');
    });

    it('removes dispatch block from content', () => {
      const content = `I'll dispatch this task to Silas.

[DISPATCH_SUGGESTED]
Summary: Update database schema
Details: Add new columns for user preferences
[/DISPATCH_SUGGESTED]

Let me know if you need anything else.`;

      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(true);
      expect(result.content).not.toContain('DISPATCH_SUGGESTED');
      expect(result.content).toContain("I'll dispatch this task");
      expect(result.content).toContain('Let me know');
    });

    it('handles multiline details', () => {
      const content = `[DISPATCH_SUGGESTED]
Summary: Complex task
Details: Step 1: Do this
Step 2: Do that
Step 3: Final step
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(true);
      expect(result.dispatchDetails).toContain('Step 1');
      expect(result.dispatchDetails).toContain('Step 2');
      expect(result.dispatchDetails).toContain('Step 3');
    });

    it('handles case insensitive tags', () => {
      const content = `[dispatch_suggested]
Summary: Test task
Details: Test details
[/dispatch_suggested]`;

      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(true);
      expect(result.dispatchSummary).toBe('Test task');
    });

    it('handles whitespace variations', () => {
      const content = `[DISPATCH_SUGGESTED]
Summary:   Whitespace test   
Details:   Details with spaces   
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchSuggestion(content);

      expect(result.suggestDispatch).toBe(true);
      expect(result.dispatchSummary).toBe('Whitespace test');
      expect(result.dispatchDetails).toBe('Details with spaces');
    });

    it('handles empty content', () => {
      const result = parseDispatchSuggestion('');

      expect(result.suggestDispatch).toBe(false);
      expect(result.content).toBe('');
    });

    it('handles malformed dispatch block (missing summary)', () => {
      const content = `[DISPATCH_SUGGESTED]
Details: Only details here
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchSuggestion(content);

      // Should not match because Summary is required
      expect(result.suggestDispatch).toBe(false);
    });

    it('handles malformed dispatch block (missing details)', () => {
      const content = `[DISPATCH_SUGGESTED]
Summary: Only summary here
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchSuggestion(content);

      // Should not match because Details is required
      expect(result.suggestDispatch).toBe(false);
    });
  });

  describe('convertToAnthropicMessages', () => {
    it('converts empty array', () => {
      const result = convertToAnthropicMessages([]);

      expect(result).toEqual([]);
    });

    it('converts single user message', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const result = convertToAnthropicMessages(messages);

      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('converts conversation with multiple messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hi', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hello!', timestamp: '2024-01-01T00:00:01Z' },
        { role: 'user', content: 'How are you?', timestamp: '2024-01-01T00:00:02Z' },
        { role: 'assistant', content: "I'm good!", timestamp: '2024-01-01T00:00:03Z' },
      ];

      const result = convertToAnthropicMessages(messages);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ role: 'user', content: 'Hi' });
      expect(result[1]).toEqual({ role: 'assistant', content: 'Hello!' });
      expect(result[2]).toEqual({ role: 'user', content: 'How are you?' });
      expect(result[3]).toEqual({ role: 'assistant', content: "I'm good!" });
    });

    it('strips timestamp from messages', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      const result = convertToAnthropicMessages(messages);

      expect(result[0]).not.toHaveProperty('timestamp');
    });
  });

  describe('getSystemPrompt', () => {
    it('returns the system prompt', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain('Xander');
      expect(prompt).toContain('conversational');
      expect(prompt).toContain('DISPATCH_SUGGESTED');
    });

    it('includes dispatch format instructions', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain('[DISPATCH_SUGGESTED]');
      expect(prompt).toContain('Summary:');
      expect(prompt).toContain('Details:');
      expect(prompt).toContain('[/DISPATCH_SUGGESTED]');
    });

    it('includes personality guidelines', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain('Natural');
      expect(prompt).toContain('concise');
    });
  });

  describe('getAnthropicClient', () => {
    it('throws error when ANTHROPIC_API_KEY is not set', () => {
      // Ensure the env var is not set
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => getAnthropicClient()).toThrow(
        'ANTHROPIC_API_KEY environment variable is required'
      );
    });

    it('creates client when API key is set', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

      const client = getAnthropicClient();

      expect(client).toBeDefined();
    });

    it('returns same client instance on multiple calls', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

      const client1 = getAnthropicClient();
      const client2 = getAnthropicClient();

      expect(client1).toBe(client2);
    });
  });

  describe('setAnthropicClient', () => {
    it('allows setting a custom client', () => {
      const mockClient = {
        messages: {
          create: vi.fn(),
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

      const client = getAnthropicClient();

      expect(client).toBe(mockClient);
    });

    it('allows resetting client to null', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

      // Create a client
      getAnthropicClient();

      // Reset it
      setAnthropicClient(null);

      // Getting it again should create a new one
      const newClient = getAnthropicClient();
      expect(newClient).toBeDefined();
    });
  });

  describe('chat', () => {
    it('calls Anthropic API with correct parameters', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello there!' }],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      await chat('Hello');

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: expect.stringContaining('Xander'),
          messages: [{ role: 'user', content: 'Hello' }],
        })
      );
    });

    it('includes conversation history in messages', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      const history: Message[] = [
        { role: 'user', content: 'First message', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'First response', timestamp: '2024-01-01T00:00:01Z' },
      ];

      await chat('Second message', history);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' },
          ],
        })
      );
    });

    it('returns parsed LLM result without dispatch', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Just a regular response.' }],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      const result = await chat('Hello');

      expect(result.content).toBe('Just a regular response.');
      expect(result.suggestDispatch).toBe(false);
      expect(result.dispatchSummary).toBeUndefined();
    });

    it('returns parsed LLM result with dispatch suggestion', async () => {
      const responseText = `I'll set that up for you.

[DISPATCH_SUGGESTED]
Summary: Create notification system
Details: Build push notifications with Firebase
[/DISPATCH_SUGGESTED]`;

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      const result = await chat('Create a notification system');

      expect(result.suggestDispatch).toBe(true);
      expect(result.dispatchSummary).toBe('Create notification system');
      expect(result.dispatchDetails).toContain('Firebase');
      expect(result.content).not.toContain('DISPATCH_SUGGESTED');
    });

    it('handles empty response content', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      const result = await chat('Hello');

      expect(result.content).toBe('');
      expect(result.suggestDispatch).toBe(false);
    });

    it('handles non-text content blocks', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          { type: 'tool_use', id: 'tool-1', name: 'test', input: {} },
          { type: 'text', text: 'Actual text content' },
        ],
      });

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      const result = await chat('Hello');

      expect(result.content).toBe('Actual text content');
    });

    it('throws error with context on API failure', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      await expect(chat('Hello')).rejects.toThrow('LLM request failed: API rate limit exceeded');
    });

    it('handles unknown error types', async () => {
      const mockCreate = vi.fn().mockRejectedValue('Unknown error string');

      const mockClient = {
        messages: {
          create: mockCreate,
        },
      } as unknown as ReturnType<typeof getAnthropicClient>;

      setAnthropicClient(mockClient);

      await expect(chat('Hello')).rejects.toThrow('LLM request failed with unknown error');
    });
  });
});
