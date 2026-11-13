import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GroupedLists, SortableCards } from './DragDemos';

// jsdom has no layout: give elements fixed boxes (page = viewport, no scroll).
// Everything sits below y = 64, so the drag never tries to scroll the page.
const place = (el: Element, left: number, top: number, width: number, height: number) => {
  el.getBoundingClientRect = () =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
};

const titles = () => screen.getAllByRole('heading').map((h) => h.textContent);
const rowsOf = (name: string) =>
  within(screen.getByRole('group', { name }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent);

describe('SortableCards (useDragSort, free mode)', () => {
  it('drags a card onto another card in the grid', () => {
    render(<SortableCards />);
    // A 2×2 grid of 190×90 cards
    screen.getAllByRole('listitem').forEach((card, i) => {
      place(card, (i % 2) * 200, 100 + Math.floor(i / 2) * 100, 190, 90);
    });
    const grip = screen.getByRole('button', { name: 'Move Alpha' });
    fireEvent.pointerDown(grip, { button: 0, clientX: 50, clientY: 150, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 250, clientY: 250, pointerId: 1 });
    // Over Delta: highlighted, nothing moves until the drop
    expect(screen.getAllByRole('listitem')[3]).toHaveClass('ring-2');
    expect(titles()).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(titles()).toEqual(['Beta', 'Gamma', 'Delta', 'Alpha']);
  });

  it('moves a card with the arrow keys on its grip', async () => {
    const user = userEvent.setup();
    render(<SortableCards />);
    screen.getByRole('button', { name: 'Move Beta' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(titles()).toEqual(['Beta', 'Alpha', 'Gamma', 'Delta']);
  });
});

describe('GroupedLists (useListsDragSort)', () => {
  it('drags a row into an empty card', () => {
    render(<GroupedLists />);
    // Three cards side by side; rows 40px tall from y = 150
    ['To do', 'Doing', 'Done'].forEach((name, l) => {
      const card = screen.getByRole('group', { name });
      place(card, l * 200, 100, 190, 300);
      within(card)
        .queryAllByRole('listitem')
        .forEach((row, i) => place(row, l * 200, 150 + i * 40, 190, 40));
    });
    const grip = screen.getByRole('button', { name: 'Move Review PR' });
    fireEvent.pointerDown(grip, { button: 0, clientX: 250, clientY: 170, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientX: 450, clientY: 170, pointerId: 1 });
    expect(screen.getByRole('group', { name: 'Done' })).toHaveClass('ring-2');
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(rowsOf('Done')).toEqual(['Review PR']);
    expect(rowsOf('Doing')).toEqual([]);
    expect(screen.getByText('Drop a row here.')).toBeInTheDocument();
  });

  it('moves a row past the end of its card into the next one with ↓', async () => {
    const user = userEvent.setup();
    render(<GroupedLists />);
    screen.getByRole('button', { name: 'Move Plan release' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(rowsOf('To do')).toEqual(['Write docs', 'Fix bug']);
    expect(rowsOf('Doing')).toEqual(['Plan release', 'Review PR']);
    // The row was re-created in the other card; its grip gets the focus back
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Plan release' })).toHaveFocus(),
    );
  });
});
