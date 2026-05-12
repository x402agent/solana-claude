import { PluginChannel, SolanaClawdOS } from '@solana-clawd/chat-plugin-sdk/client';
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock window and postMessage before each test
beforeEach(() => {
  global.window = {
    addEventListener: vi.fn(),
    postMessage: vi.fn(),
    removeEventListener: vi.fn(),
  } as any;

  global.top = {
    postMessage: vi.fn(),
  } as any;
});

// Clean up mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

describe('SolanaClawdOS', () => {
  describe('getPluginMessage', () => {
    it('should resolve undefined when window is undefined', async () => {
      const originalWindow = global.window;
      global.window = undefined as any;

      const result = await SolanaClawdOS.getPluginMessage();

      expect(result).toBeUndefined();
      global.window = originalWindow;
    });

    it('should resolve with content when message received', async () => {
      const mockContent = { some: 'data' };

      (global.window.addEventListener as Mock).mockImplementation((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              props: {
                content: mockContent,
              },
              type: PluginChannel.renderPlugin,
            },
          } as MessageEvent);
        }
      });

      const promise = SolanaClawdOS.getPluginMessage<typeof mockContent>();

      const result = await promise;

      expect(result).toEqual(mockContent);
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should post message to parent to fetch plugin message', () => {
      SolanaClawdOS.getPluginMessage();

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { type: PluginChannel.fetchPluginMessage },
        '*',
      );
    });

    it('should remove event listener after message is received', async () => {
      (global.window.addEventListener as Mock).mockImplementationOnce((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              props: {
                content: {},
              },
              type: PluginChannel.renderPlugin,
            },
          } as MessageEvent);
        }
      });
      const promise = SolanaClawdOS.getPluginMessage();

      await promise;

      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('getPluginPayload', () => {
    it('should resolve undefined when window is undefined', async () => {
      const originalWindow = global.window;
      global.window = undefined as any;

      const result = await SolanaClawdOS.getPluginPayload();

      expect(result).toBeUndefined();
      global.window = originalWindow;
    });

    it('should resolve with payload when message is received', async () => {
      const mockPayload = {
        arguments: { id: '123' },
        name: 'testFunction',
        settings: { color: 'blue' },
        state: { active: true },
      };

      (global.window.addEventListener as Mock).mockImplementation((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              payload: {
                apiName: mockPayload.name,
                arguments: JSON.stringify(mockPayload.arguments),
              },
              settings: mockPayload.settings,
              state: mockPayload.state,
              type: PluginChannel.initStandalonePlugin,
            },
          } as MessageEvent);
        }
      });

      const promise = SolanaClawdOS.getPluginPayload<typeof mockPayload.arguments>();

      const result = await promise;

      expect(result).toEqual(mockPayload);
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should post message to parent to signal plugin is ready for render', () => {
      SolanaClawdOS.getPluginPayload();

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { type: PluginChannel.pluginReadyForRender },
        '*',
      );
    });

    it('should remove event listener after payload is received', async () => {
      (global.window.addEventListener as Mock).mockImplementationOnce((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              payload: {
                apiName: 'testFunction',
                arguments: '{}',
              },
              settings: {},
              state: {},
              type: PluginChannel.initStandalonePlugin,
            },
          } as MessageEvent);
        }
      });

      const promise = SolanaClawdOS.getPluginPayload();

      await promise;

      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should resolve undefined if message is not received within timeout', async () => {
      vi.useFakeTimers();

      const promise = SolanaClawdOS.getPluginPayload();

      // Fast-forward until all timers have been executed
      vi.runAllTimers();

      const result = await promise;

      expect(result).toBeUndefined();
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );

      vi.useRealTimers();
    });
  });

  describe('fetchPluginSettings', () => {
    it('should resolve undefined when window is undefined', async () => {
      const originalWindow = global.window;
      global.window = undefined as any;

      const result = await SolanaClawdOS.getPluginSettings();

      expect(result).toBeUndefined();
      global.window = originalWindow;
    });

    it('should resolve with settings when message is received', async () => {
      const mockSettings = {
        notifications: true,
        theme: 'dark',
      };

      (global.window.addEventListener as Mock).mockImplementation((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              type: PluginChannel.renderPluginSettings,
              value: mockSettings,
            },
          } as MessageEvent);
        }
      });

      const promise = SolanaClawdOS.getPluginSettings<typeof mockSettings>();

      const result = await promise;

      expect(result).toEqual(mockSettings);
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should post message to parent to fetch plugin settings', () => {
      SolanaClawdOS.getPluginSettings();

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { type: PluginChannel.fetchPluginSettings },
        '*',
      );
    });

    it('should remove event listener after settings are received', async () => {
      (global.window.addEventListener as Mock).mockImplementationOnce((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              type: PluginChannel.renderPluginSettings,
              value: {},
            },
          } as MessageEvent);
        }
      });

      const promise = SolanaClawdOS.getPluginSettings();

      await promise;

      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('fetchPluginState', () => {
    const testKey = 'testKey';
    const mockStateValue = 'mockState';

    it('should resolve undefined when window is undefined', async () => {
      const originalWindow = global.window;
      global.window = undefined as any;

      const result = await SolanaClawdOS.getPluginState(testKey);

      expect(result).toBeUndefined();
      global.window = originalWindow;
    });

    it('should resolve with state value when message is received', async () => {
      (global.window.addEventListener as Mock).mockImplementation((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              key: testKey,
              type: PluginChannel.renderPluginState,
              value: mockStateValue,
            },
          } as MessageEvent);
        }
      });

      const result = await SolanaClawdOS.getPluginState(testKey);

      expect(result).toEqual(mockStateValue);
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should post message to parent to fetch plugin state for a given key', () => {
      SolanaClawdOS.getPluginState(testKey);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { key: testKey, type: PluginChannel.fetchPluginState },
        '*',
      );
    });

    it('should remove event listener after state is received', async () => {
      (global.window.addEventListener as Mock).mockImplementationOnce((event, handler) => {
        if (event === 'message') {
          handler({
            data: {
              key: testKey,
              type: PluginChannel.renderPluginState,
              value: mockStateValue,
            },
          } as MessageEvent);
        }
      });

      await SolanaClawdOS.getPluginState(testKey);

      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('setPluginMessage', () => {
    it('should post message to parent with content to fill plugin', () => {
      const content = { text: 'Hello, world!' };
      SolanaClawdOS.setPluginMessage(content);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { content, type: PluginChannel.fillStandalonePluginContent },
        '*',
      );
    });
  });

  describe('setPluginState', () => {
    it('should post message to parent with key and value to update plugin state', () => {
      const stateKey = 'theme';
      const stateValue = 'dark';

      SolanaClawdOS.setPluginState(stateKey, stateValue);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { key: stateKey, type: PluginChannel.updatePluginState, value: stateValue },
        '*',
      );
    });
  });

  describe('setPluginSettings', () => {
    it('should post message to parent with settings to update plugin settings', () => {
      const settings = { notifications: true };

      SolanaClawdOS.setPluginSettings(settings);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { type: PluginChannel.updatePluginSettings, value: settings },
        '*',
      );
    });
  });

  describe('triggerAIMessage', () => {
    it('should post message to parent with id to trigger AI message', () => {
      const id = 'unique-id-123';

      SolanaClawdOS.triggerAIMessage(id);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { id, type: PluginChannel.triggerAIMessage },
        '*',
      );
    });
  });

  describe('createAssistantMessage', () => {
    it('should post message to parent with content to create assistant message', () => {
      const content = 'This is an AI-generated message';

      SolanaClawdOS.createAssistantMessage(content);

      expect(global.top?.postMessage).toHaveBeenCalledWith(
        { content, type: PluginChannel.createAssistantMessage },
        '*',
      );
    });
  });
});

