// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  flags: { aiConversation: true } as Record<string, boolean>,
  openAssistant: vi.fn(),
}));

vi.mock('../../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));
vi.mock('./AssistantProvider', () => ({
  useAssistant: () => ({ open: false, seed: {}, openAssistant: h.openAssistant, close: vi.fn() }),
}));

import { AskSinghaButton } from './AskSinghaButton';

beforeEach(() => {
  h.flags = { aiConversation: true };
  h.openAssistant.mockReset();
});
afterEach(cleanup);

describe('AskSinghaButton (AIC-5)', () => {
  it('renders nothing (both variants) when aiConversation is off', () => {
    h.flags = { aiConversation: false };
    const full = render(<AskSinghaButton listingId="lot-1" />);
    expect(full.container.innerHTML).toBe('');
    full.unmount();

    const compact = render(<AskSinghaButton listingId="lot-1" variant="compact" />);
    expect(compact.container.innerHTML).toBe('');
  });

  it('full variant: renders a labelled secondary action', () => {
    render(<AskSinghaButton listingId="lot-1" />);
    expect(screen.getByRole('button', { name: 'Ask Singha AI' })).toBeTruthy();
  });

  it('full variant: clicking calls openAssistant with the given listingId and url', () => {
    render(<AskSinghaButton listingId="lot-1" url="/lot/lot-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Singha AI' }));
    expect(h.openAssistant).toHaveBeenCalledTimes(1);
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-1', url: '/lot/lot-1' });
  });

  it('full variant: url is optional', () => {
    render(<AskSinghaButton listingId="lot-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Singha AI' }));
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-1', url: undefined });
  });

  it('compact variant: clicking calls openAssistant with the given listingId', () => {
    render(<AskSinghaButton listingId="lot-2" url="/lot/lot-2" variant="compact" />);
    fireEvent.click(screen.getByRole('button', { name: /ask singha ai about this lot/i }));
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-2', url: '/lot/lot-2' });
  });

  it('compact variant: Enter and Space activate it like a real button', () => {
    render(<AskSinghaButton listingId="lot-3" variant="compact" />);
    const trigger = screen.getByRole('button', { name: /ask singha ai about this lot/i });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-3', url: undefined });

    h.openAssistant.mockClear();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-3', url: undefined });

    h.openAssistant.mockClear();
    fireEvent.keyDown(trigger, { key: 'a' });
    expect(h.openAssistant).not.toHaveBeenCalled();
  });

  it('compact variant: never triggers a surrounding click handler (safe to nest in a card link)', () => {
    const outerClick = vi.fn();
    render(
      <div onClick={outerClick}>
        <AskSinghaButton listingId="lot-4" variant="compact" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /ask singha ai about this lot/i }));
    expect(h.openAssistant).toHaveBeenCalledWith({ listingId: 'lot-4', url: undefined });
    expect(outerClick).not.toHaveBeenCalled();
  });
});
