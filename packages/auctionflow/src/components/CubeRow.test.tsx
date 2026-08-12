// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { AuctionFlowViewport } from './AuctionFlowViewport';
import { CubeRow } from './CubeRow';

interface Lot {
  id: string;
  title: string;
}

const lots: Lot[] = Array.from({ length: 14 }, (_, i) => ({
  id: `lot-${i}`,
  title: `Lot ${i}`,
}));

/** Click a row's "next" arrow, then complete the 3D rotation (jsdom does not
 *  fire CSS transitionend on its own) so the page commits. */
function rotateNext(scope: HTMLElement, label: string) {
  fireEvent.click(within(scope).getByLabelText(`${label}: next`));
  const stage = scope.querySelector('.af-stage')!;
  fireEvent.transitionEnd(stage);
}

function renderRow() {
  return render(
    <AuctionFlowViewport>
      <CubeRow<Lot>
        rowId="vehicles"
        title="Vehicles"
        items={lots}
        itemKey={(l) => l.id}
        renderItem={(l) => <a href={`/lot/${l.id}`}>{l.title}</a>}
      />
    </AuctionFlowViewport>,
  );
}

afterEach(cleanup);

describe('CubeRow', () => {
  it('renders the first face and keeps offscreen faces inert (not focusable)', () => {
    const { container } = renderRow();

    // 14 lots at 4/face (jsdom has no layout → default desktop width) → face 0
    // shows the first four, and only current + prev + next stay mounted.
    const faces = container.querySelectorAll('.af-face');
    expect(faces.length).toBe(3);

    const active = container.querySelector('.af-face[data-active="true"]')!;
    expect(within(active as HTMLElement).getByText('Lot 0')).toBeTruthy();

    // Every non-active face is inert + aria-hidden, so its links can't be tabbed.
    container.querySelectorAll('.af-face[data-active="false"]').forEach((f) => {
      expect(f.hasAttribute('inert')).toBe(true);
      expect(f.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('reaches EVERY lot by rotating — not only the first six', () => {
    const { container } = renderRow();
    const activeText = () =>
      within(container.querySelector('.af-face[data-active="true"]') as HTMLElement).getAllByText(
        /^Lot \d+$/,
      );

    const seen = new Set<string>();
    const collect = () => activeText().forEach((el) => seen.add(el.textContent!));

    collect();
    // 14 lots / 4 per face = 4 faces. Rotate through all of them (and wrap).
    for (let i = 0; i < 4; i++) {
      rotateNext(container.querySelector('.af-row') as HTMLElement, 'Vehicles');
      collect();
    }

    for (let i = 0; i < 14; i++) expect(seen.has(`Lot ${i}`)).toBe(true);
  });

  it('renders independent rows that do not share a face position', () => {
    // Pin 4 faces/page so this test asserts INDEPENDENCE deterministically,
    // independent of the responsive density mapping (§7).
    const { container } = render(
      <AuctionFlowViewport>
        <CubeRow<Lot>
          rowId="a"
          title="Gems"
          items={lots}
          maxPerFace={4}
          itemKey={(l) => l.id}
          renderItem={(l) => <span>{`A ${l.title}`}</span>}
        />
        <CubeRow<Lot>
          rowId="b"
          title="Art"
          items={lots}
          maxPerFace={4}
          itemKey={(l) => l.id}
          renderItem={(l) => <span>{`B ${l.title}`}</span>}
        />
      </AuctionFlowViewport>,
    );

    const rows = container.querySelectorAll('.af-row');
    // Rotate only the first row; the second must stay on face 0.
    rotateNext(rows[0] as HTMLElement, 'Gems');

    const activeA = (rows[0] as HTMLElement).querySelector(
      '.af-face[data-active="true"]',
    ) as HTMLElement;
    const activeB = (rows[1] as HTMLElement).querySelector(
      '.af-face[data-active="true"]',
    ) as HTMLElement;
    expect(within(activeA).getByText('A Lot 4')).toBeTruthy(); // row A moved
    expect(within(activeB).getByText('B Lot 0')).toBeTruthy(); // row B unchanged
  });
});
