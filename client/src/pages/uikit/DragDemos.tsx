import { useState } from 'react';
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  DragHandle,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useDragSort } from '@/lib/useDragSort';
import { useListsDragSort } from '@/lib/useListsDragSort';

/** `list` with the entry at `from` moved to `to` (a new array). */
function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry!);
  return next;
}

const CARDS = [
  { title: 'Alpha', description: 'Drag me by the grip.' },
  { title: 'Beta', description: 'Or focus the grip and press ↑/↓.' },
  { title: 'Gamma', description: 'The card under the pointer is highlighted.' },
  { title: 'Delta', description: 'It takes that card’s place on drop.' },
];

/** A grid of cards reordered by their header grip (`useDragSort` in `free` mode). */
export function SortableCards() {
  const [cards, setCards] = useState(CARDS);
  const sort = useDragSort(cards.length, (from, to) => setCards((c) => moved(c, from, to)), {
    free: true,
  });

  return (
    <div role="list" className="grid gap-4 sm:grid-cols-2">
      {cards.map((card, i) => (
        <div
          key={card.title}
          role="listitem"
          ref={sort.rowRef(i)}
          style={sort.rowStyle(i)}
          className={cn(
            'rounded-lg',
            sort.dragging === i && 'shadow-lg',
            sort.over === i && 'ring-2 ring-primary',
          )}
        >
          <Card>
            <CardHeader
              grip={
                <DragHandle
                  label={`Move ${card.title}`}
                  active={sort.dragging === i}
                  {...sort.handleProps(i)}
                />
              }
            >
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ))}
    </div>
  );
}

const LISTS = [
  { name: 'To do', rows: ['Write docs', 'Fix bug', 'Plan release'] },
  { name: 'Doing', rows: ['Review PR'] },
  { name: 'Done', rows: [] as string[] },
];

/** Cards holding lists; rows move within a card and between cards (`useListsDragSort`). */
export function GroupedLists() {
  const [lists, setLists] = useState(LISTS);
  const sort = useListsDragSort(
    lists.map((l) => l.rows.length),
    (from, to) => {
      const row = lists[from.list]!.rows[from.index]!;
      setLists((all) => {
        const next = all.map((l) => ({ ...l, rows: [...l.rows] }));
        next[from.list]!.rows.splice(from.index, 1);
        next[to.list]!.rows.splice(to.index, 0, row);
        return next;
      });
      // A move to another card re-creates the row: keep the keyboard on its grip
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        document.querySelector<HTMLElement>(`[data-grip="${row}"]`)?.focus();
      });
    },
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {lists.map((list, l) => {
        // The drop line while a row from another card is over this one
        const dropAt = sort.target?.list === l ? sort.target.index : null;
        const count = list.rows.length;
        return (
          <div
            key={list.name}
            role="group"
            aria-label={list.name}
            ref={sort.listRef(l)}
            className={cn('rounded-lg', sort.target?.list === l && 'ring-2 ring-primary')}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{list.name}</CardTitle>
                <CardDescription>{count === 1 ? '1 row' : `${count} rows`}</CardDescription>
              </CardHeader>
              {count ? (
                <ul>
                  {list.rows.map((row, i) => {
                    const dragging = sort.dragging?.list === l && sort.dragging.index === i;
                    return (
                      <li
                        key={row}
                        ref={sort.rowRef(l, i)}
                        style={sort.rowStyle(l, i)}
                        className={cn(
                          'relative flex items-center gap-2 border-b border-border bg-surface py-1 pr-5 pl-2 text-sm last:border-b-0',
                          dragging && 'rounded-md shadow-lg ring-1 ring-border',
                        )}
                      >
                        {(dropAt === i || (dropAt === count && i === count - 1)) && (
                          <span
                            aria-hidden
                            className={cn(
                              'pointer-events-none absolute inset-x-3 h-0.5 rounded-full bg-primary',
                              dropAt === i ? '-top-px' : '-bottom-px',
                            )}
                          />
                        )}
                        <DragHandle
                          label={`Move ${row}`}
                          data-grip={row}
                          active={dragging}
                          className="h-10"
                          {...sort.handleProps(l, i)}
                        />
                        {row}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <CardBody className="text-sm text-fg-muted">Drop a row here.</CardBody>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
