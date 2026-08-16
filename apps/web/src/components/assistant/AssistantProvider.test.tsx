// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AssistantProvider, useAssistant } from './AssistantProvider';

afterEach(cleanup);

function Probe() {
  const { open, seed, openAssistant, close } = useAssistant();
  return (
    <div>
      <p data-testid="open">{String(open)}</p>
      <p data-testid="seed">{JSON.stringify(seed)}</p>
      <button onClick={() => openAssistant()}>open-empty</button>
      <button onClick={() => openAssistant({ listingId: 'lot-1', url: '/lot/lot-1' })}>
        open-seeded
      </button>
      <button onClick={close}>close</button>
    </div>
  );
}

describe('AssistantProvider / useAssistant (AIC-5)', () => {
  it('outside a provider, useAssistant returns a safe closed no-op default', () => {
    render(<Probe />);
    expect(screen.getByTestId('open').textContent).toBe('false');
    expect(screen.getByTestId('seed').textContent).toBe('{}');
    expect(() => fireEvent.click(screen.getByText('open-empty'))).not.toThrow();
    expect(() => fireEvent.click(screen.getByText('close'))).not.toThrow();
  });

  it('openAssistant() opens with an empty seed; openAssistant(seed) opens pre-seeded', () => {
    render(
      <AssistantProvider>
        <Probe />
      </AssistantProvider>,
    );
    expect(screen.getByTestId('open').textContent).toBe('false');

    fireEvent.click(screen.getByText('open-seeded'));
    expect(screen.getByTestId('open').textContent).toBe('true');
    expect(screen.getByTestId('seed').textContent).toBe(
      JSON.stringify({ listingId: 'lot-1', url: '/lot/lot-1' }),
    );

    fireEvent.click(screen.getByText('close'));
    expect(screen.getByTestId('open').textContent).toBe('false');
    // Closing doesn't clear the seed — only the next explicit open re-seeds it.
    expect(screen.getByTestId('seed').textContent).toBe(
      JSON.stringify({ listingId: 'lot-1', url: '/lot/lot-1' }),
    );

    fireEvent.click(screen.getByText('open-empty'));
    expect(screen.getByTestId('open').textContent).toBe('true');
    expect(screen.getByTestId('seed').textContent).toBe('{}');
  });

  it('is shared context: every consumer under one provider sees the same state', () => {
    render(
      <AssistantProvider>
        <Probe />
        <Probe />
      </AssistantProvider>,
    );
    fireEvent.click(screen.getAllByText('open-seeded')[0]!);
    const opens = screen.getAllByTestId('open');
    expect(opens[0]!.textContent).toBe('true');
    expect(opens[1]!.textContent).toBe('true');
  });
});
