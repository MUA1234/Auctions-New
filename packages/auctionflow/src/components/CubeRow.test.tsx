// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { AuctionFlowViewport } from './AuctionFlowViewport';
import { CubeRow } from './CubeRow';

interface Lot {
  id: string;
  title: string;
}

const makeLots = (n: number): Lot[] =>
  Array.from({ length: n }, (_, i) => ({ id: `lot-${i}`, title: `Lot ${i}` }));

const lots = makeLots(14);

/** Click a row's "next" arrow, then complete the quarter-turn (jsdom does not
 *  fire CSS transitionend on its own) so the page commits. */
function rotateNext(scope: HTMLElement, label: string) {
  fireEvent.click(within(scope).getByLabelText(`${label}: next`));
  const stage = scope.querySelector('.af-stage')!;
  fireEvent.transitionEnd(stage);
}

function activeFace(scope: HTMLElement): HTMLElement {
  return scope.querySelector('.af-face[data-active="true"]') as HTMLElement;
}

function renderRow(rowLots: Lot[] = lots, maxPerFace?: number) {
  return render(
    <AuctionFlowViewport>
      <CubeRow<Lot>
        rowId="vehicles"
        title="Vehicles"
        items={rowLots}
        maxPerFace={maxPerFace}
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

    // A multi-page row keeps the current face plus its two neighbours mounted so
    // a quarter-turn has something to pivot to — but the neighbours are folded
    // edge-on and inert.
    const faces = container.querySelectorAll('.af-face');
    expect(faces.length).toBe(3);

    const active = activeFace(container);
    expect(within(active).getByText('Lot 0')).toBeTruthy();

    // Every non-active face is inert + aria-hidden, so its links can't be tabbed.
    container.querySelectorAll('.af-face[data-active="false"]').forEach((f) => {
      expect(f.hasAttribute('inert')).toBe(true);
      expect(f.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('reaches EVERY lot by rotating — not only the first face', () => {
    const { container } = renderRow();
    const seen = new Set<string>();
    const collect = () =>
      within(activeFace(container))
        .getAllByText(/^Lot \d+$/)
        .forEach((el) => seen.add(el.textContent!));

    collect();
    for (let i = 0; i < 4; i++) {
      rotateNext(container.querySelector('.af-row') as HTMLElement, 'Vehicles');
      collect();
    }

    for (let i = 0; i < 14; i++) expect(seen.has(`Lot ${i}`)).toBe(true);
  });

  it('renders independent rows that do not share a face position', () => {
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
    rotateNext(rows[0] as HTMLElement, 'Gems');

    expect(within(activeFace(rows[0] as HTMLElement)).getByText('A Lot 4')).toBeTruthy(); // moved
    expect(within(activeFace(rows[1] as HTMLElement)).getByText('B Lot 0')).toBeTruthy(); // unchanged
  });

  // --- Revision 06.1 regressions -------------------------------------------

  it('makes a single-page row fully static: no 3D viewport, no rotation, disabled controls (§7)', () => {
    // 3 lots at the jsdom default density is one page → static rail, not a cube.
    const { container } = renderRow(makeLots(3));

    expect(container.querySelector('.af-viewport')).toBeNull();
    expect(container.querySelector('.af-rail')).not.toBeNull();
    // No mounted faces at all — nothing hidden to leak (§7 "no hidden prev/next").
    expect(container.querySelectorAll('.af-face').length).toBe(0);

    const next = within(container).getByLabelText('Vehicles: next') as HTMLButtonElement;
    const prev = within(container).getByLabelText('Vehicles: previous') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(true);

    // Arrow key on the static rail must not change what is shown.
    fireEvent.keyDown(container.querySelector('.af-rail')!, { key: 'ArrowRight' });
    expect(within(container).getByText('Lot 0')).toBeTruthy();
    expect(within(container).getByText('Lot 2')).toBeTruthy();
  });

  it('keeps a partial final face at normal slicing (no stretch / no duplicate) (§8)', () => {
    // 9 lots at 5/face → face 0 = 0..4, final face = 5..8 (four cards).
    const { container } = renderRow(makeLots(9));
    rotateNext(container.querySelector('.af-row') as HTMLElement, 'Vehicles');

    const active = activeFace(container);
    expect(
      within(active)
        .getAllByText(/^Lot \d+$/)
        .map((n) => n.textContent),
    ).toEqual(['Lot 5', 'Lot 6', 'Lot 7', 'Lot 8']);
  });

  it('does not reset the visible face when realtime data appends more lots (§11)', () => {
    const { container, rerender } = render(
      <AuctionFlowViewport>
        <CubeRow<Lot>
          rowId="vehicles"
          title="Vehicles"
          items={makeLots(14)}
          itemKey={(l) => l.id}
          renderItem={(l) => <a href={`/lot/${l.id}`}>{l.title}</a>}
        />
      </AuctionFlowViewport>,
    );

    rotateNext(container.querySelector('.af-row') as HTMLElement, 'Vehicles');
    expect(within(activeFace(container)).getByText('Lot 5')).toBeTruthy(); // now on face 1

    // A realtime update grows the row; the visible face must stay put.
    rerender(
      <AuctionFlowViewport>
        <CubeRow<Lot>
          rowId="vehicles"
          title="Vehicles"
          items={makeLots(20)}
          itemKey={(l) => l.id}
          renderItem={(l) => <a href={`/lot/${l.id}`}>{l.title}</a>}
        />
      </AuctionFlowViewport>,
    );

    const active = activeFace(container);
    expect(within(active).getByText('Lot 5')).toBeTruthy();
    expect(within(active).queryByText('Lot 0')).toBeNull();
  });

  it('pages from a dot click — not only via the rotation animation', () => {
    // 14 lots at 5/face → 3 faces, 3 dots. Selecting the last dot must move the
    // row even though there is no quarter-turn animation to piggyback on.
    const { container } = renderRow();
    fireEvent.click(
      within(container.querySelector('.af-row') as HTMLElement).getByLabelText(
        'Vehicles: face 3 of 3',
      ),
    );
    const active = activeFace(container);
    expect(within(active).getByText('Lot 10')).toBeTruthy(); // face 3 → lots 10..13
    expect(within(active).queryByText('Lot 0')).toBeNull();
  });

  it('reduced-motion: arrows page the static rail instantly, no 3D (§15)', () => {
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: /reduce/.test(q),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    })) as unknown as typeof window.matchMedia;
    try {
      const { container } = renderRow();
      // Reduced motion → non-rotating rail, no 3D stage.
      expect(container.querySelector('.af-rail')).not.toBeNull();
      expect(container.querySelector('.af-stage')).toBeNull();

      const rail = () => container.querySelector('.af-rail') as HTMLElement;
      expect(within(rail()).getByText('Lot 0')).toBeTruthy();

      // Arrow pages immediately — no transitionend needed.
      fireEvent.click(within(container).getByLabelText('Vehicles: next'));
      expect(within(rail()).getByText('Lot 5')).toBeTruthy();
      expect(within(rail()).queryByText('Lot 0')).toBeNull();
    } finally {
      window.matchMedia = orig;
    }
  });
});
