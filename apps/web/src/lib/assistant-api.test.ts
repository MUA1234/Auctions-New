import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiBase } from './api';
import {
  askAssistant,
  assistantChannelRequest,
  assistantSearch,
  getAssistantConversation,
} from './assistant-api';
import { friendlyMessage } from '../components/evolution/evo-api-error';

const TOKEN = 'test-bearer-token';

/** Minimal `Response` stand-in — only the members `apiPost`/`apiGetAuthed` (`./api`) touch. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 400);
  return { ok, status, json: () => Promise.resolve(body) } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assistant-api (AIC-5 FE client)', () => {
  it('askAssistant POSTs to /assistant/message with the bearer token and exact body', async () => {
    const responseBody = {
      conversationId: 'conv-1',
      reply: 'Bidding works like this…',
      refused: false,
      suggestions: ['Make an offer instead'],
    };
    fetchMock.mockResolvedValue(jsonResponse(responseBody));

    const result = await askAssistant(
      { message: 'How does bidding work?', listingId: 'lot-1', url: '/lot/lot-1' },
      TOKEN,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${apiBase}/assistant/message`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    });
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'How does bidding work?',
      listingId: 'lot-1',
      url: '/lot/lot-1',
    });
    expect(result).toEqual(responseBody);
  });

  it('askAssistant omits listingId/url/conversationId entirely when not given', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ conversationId: 'conv-2', reply: 'Hi', refused: false }),
    );
    await askAssistant({ message: 'Hello' }, TOKEN);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Hello' });
  });

  it('assistantSearch POSTs to /assistant/search with the query and optional conversationId', async () => {
    const responseBody = {
      query: 'blue sapphire',
      interpreted: { category: 'gems' },
      results: [],
      total: 0,
      refused: false,
    };
    fetchMock.mockResolvedValue(jsonResponse(responseBody));

    const result = await assistantSearch(
      { query: 'blue sapphire', conversationId: 'conv-1' },
      TOKEN,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${apiBase}/assistant/search`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      query: 'blue sapphire',
      conversationId: 'conv-1',
    });
    expect(result).toEqual(responseBody);
  });

  it('assistantChannelRequest POSTs to /assistant/channel-request and omits phone when not given', async () => {
    const responseBody = {
      channel: 'whatsapp',
      deepLink: 'https://wa.me/continue?token=abc',
      continuityToken: 'abc',
    };
    fetchMock.mockResolvedValue(jsonResponse(responseBody));

    const result = await assistantChannelRequest(
      { conversationId: 'conv-1', channel: 'whatsapp' },
      TOKEN,
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${apiBase}/assistant/channel-request`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      conversationId: 'conv-1',
      channel: 'whatsapp',
    });
    expect(result).toEqual(responseBody);
  });

  it('assistantChannelRequest includes phone when given', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ channel: 'voice', callbackRequested: true, continuityToken: 'xyz' }),
    );
    await assistantChannelRequest(
      { conversationId: 'conv-1', channel: 'voice', phone: '+94770000000' },
      TOKEN,
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      conversationId: 'conv-1',
      channel: 'voice',
      phone: '+94770000000',
    });
  });

  it('getAssistantConversation GETs /assistant/conversations/:id with the bearer token and no body', async () => {
    const responseBody = {
      id: 'conv-1',
      status: 'open',
      aiMode: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      messages: [
        {
          id: 'm1',
          direction: 'inbound',
          provenance: 'customer',
          text: 'Hi',
          payload: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    fetchMock.mockResolvedValue(jsonResponse(responseBody));

    const result = await getAssistantConversation('conv-1', TOKEN);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${apiBase}/assistant/conversations/conv-1`);
    expect(init.method ?? 'GET').not.toBe('POST');
    expect(init.headers).toMatchObject({ authorization: `Bearer ${TOKEN}` });
    expect(init.body).toBeUndefined();
    expect(result).toEqual(responseBody);
  });

  it('a 400 channel-not-available error carries the backend message through friendlyMessage', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "The 'voice' channel is not available" }, { ok: false, status: 400 }),
    );

    let caught: unknown;
    try {
      await assistantChannelRequest({ conversationId: 'conv-1', channel: 'voice' }, TOKEN);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(friendlyMessage(caught, 'That channel is not available right now.')).toBe(
      "The 'voice' channel is not available",
    );
  });

  it('a 401 on askAssistant maps to a friendly "sign in again" message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 401 }));

    let caught: unknown;
    try {
      await askAssistant({ message: 'Hi' }, TOKEN);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(friendlyMessage(caught, 'Singha AI could not reply just now.')).toBe(
      'Please sign in again to continue.',
    );
  });

  it('a 404 (flag off) maps to a friendly "not available" message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 404 }));

    let caught: unknown;
    try {
      await getAssistantConversation('conv-1', TOKEN);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(friendlyMessage(caught, 'fallback')).toBe('This isn’t available right now.');
  });
});
