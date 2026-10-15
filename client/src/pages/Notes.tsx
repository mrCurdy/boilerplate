import { Database, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Note } from '@app/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  Tabs,
  Textarea,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { timeAgo } from '@/lib/format';

type Filter = 'all' | 'open' | 'done';

export default function Notes() {
  const toast = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [dbDriver, setDbDriver] = useState<string>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Note | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ notes: Note[] }>('/notes'),
      api.get<{ dbDriver: string }>('/meta'),
    ]).then(
      ([{ notes }, meta]) => {
        setNotes(notes);
        setDbDriver(meta.dbDriver);
      },
      (err) => {
        toast.error('Failed to load notes', errorMessage(err));
        setNotes([]);
      },
    );
  }, [toast]);

  const toggleDone = async (note: Note) => {
    // Optimistic update, rolled back on failure.
    setNotes((ns) => ns?.map((n) => (n.id === note.id ? { ...n, done: !n.done } : n)) ?? null);
    try {
      await api.patch(`/notes/${note.id}`, { done: !note.done });
    } catch (err) {
      setNotes((ns) => ns?.map((n) => (n.id === note.id ? note : n)) ?? null);
      toast.error('Update failed', errorMessage(err));
    }
  };

  const onSaved = (saved: Note, isNew: boolean) => {
    setNotes((ns) =>
      isNew ? [saved, ...(ns ?? [])] : (ns ?? []).map((n) => (n.id === saved.id ? saved : n)),
    );
    toast.success(isNew ? 'Note created' : 'Note updated');
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/notes/${deleting.id}`);
    setNotes((ns) => ns?.filter((n) => n.id !== deleting.id) ?? null);
    toast.success('Note deleted');
  };

  const counts = {
    all: notes?.length ?? 0,
    open: notes?.filter((n) => !n.done).length ?? 0,
    done: notes?.filter((n) => n.done).length ?? 0,
  };
  const visible = notes?.filter((n) => filter === 'all' || (filter === 'done') === n.done) ?? [];

  const list = (
    <div className="flex flex-col gap-3">
      {notes === null &&
        Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardBody className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </CardBody>
          </Card>
        ))}
      {notes && visible.length === 0 && (
        <Card>
          <EmptyState
            icon={<NotebookPen />}
            title={filter === 'all' ? 'No notes yet' : `No ${filter} notes`}
            description="Notes are stored with the active database driver and scoped to your account."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setEditing('new')}
              >
                New note
              </Button>
            }
          />
        </Card>
      )}
      {visible.map((note) => (
        <Card key={note.id} className="group">
          <CardBody className="flex items-start gap-3">
            <Checkbox
              aria-label={note.done ? 'Mark as open' : 'Mark as done'}
              checked={note.done}
              onChange={() => toggleDone(note)}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn('font-medium break-words', note.done && 'text-fg-muted line-through')}
              >
                {note.title}
              </p>
              {note.content && (
                <p className="mt-1 text-sm break-words whitespace-pre-wrap text-fg-muted">
                  {note.content}
                </p>
              )}
              <p className="mt-2 text-xs text-fg-muted">Updated {timeAgo(note.updatedAt)}</p>
            </div>
            <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit"
                onClick={() => setEditing(note)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                className="text-danger"
                onClick={() => setDeleting(note)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Notes"
        description={
          <span className="inline-flex items-center gap-2">
            CRUD over REST, persisted via <Database className="h-3.5 w-3.5" />
            <Badge tone="info">{dbDriver || '…'}</Badge>
          </span>
        }
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
            New note
          </Button>
        }
      />

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        items={(['all', 'open', 'done'] as const).map((f) => ({
          value: f,
          label: (
            <span className="inline-flex items-center gap-2 capitalize">
              {f} <span className="text-xs text-fg-muted">{counts[f]}</span>
            </span>
          ),
          content: list,
        }))}
      />

      {/* key remounts the editor so its form state starts fresh for each note */}
      <NoteEditor
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        note={editing}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete note?"
        description={deleting ? `"${deleting.title}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
      />
    </>
  );
}

function NoteEditor({
  note,
  onClose,
  onSaved,
}: {
  note: Note | 'new' | null;
  onClose: () => void;
  onSaved: (n: Note, isNew: boolean) => void;
}) {
  const isNew = note === 'new';
  const existing = note && note !== 'new' ? note : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const body = { title, content };
      const { note: saved } = isNew
        ? await api.post<{ note: Note }>('/notes', body)
        : await api.patch<{ note: Note }>(`/notes/${existing!.id}`, body);
      onSaved(saved, isNew);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { title: errorMessage(err) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={!!note} onClose={onClose} title={isNew ? 'New note' : 'Edit note'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="Title" required error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            maxLength={200}
          />
        </FormField>
        <FormField label="Content" error={errors.content}>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
