import { ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NoteWithAuthor } from '@app/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { timeAgo } from '@/lib/format';

export default function Moderation() {
  const toast = useToast();
  const [notes, setNotes] = useState<NoteWithAuthor[] | null>(null);
  const [deleting, setDeleting] = useState<NoteWithAuthor | null>(null);

  useEffect(() => {
    api.get<{ notes: NoteWithAuthor[] }>('/notes/all').then(
      (r) => setNotes(r.notes),
      (err) => {
        toast.error('Failed to load', errorMessage(err));
        setNotes([]);
      },
    );
  }, [toast]);

  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/notes/${deleting.id}`);
    setNotes((ns) => ns?.filter((n) => n.id !== deleting.id) ?? null);
    toast.success('Note removed');
  };

  return (
    <>
      <PageHeader
        title="Moderation"
        description="Moderators and admins can review and remove any user's notes."
      />
      <Card>
        {notes?.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="Nothing to moderate"
            description="No notes have been created yet."
          />
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Author</Th>
                <Th>Note</Th>
                <Th className="hidden sm:table-cell">Status</Th>
                <Th className="hidden md:table-cell">Created</Th>
                <Th />
              </Tr>
            </THead>
            <TBody>
              {notes === null &&
                Array.from({ length: 3 }, (_, i) => (
                  <Tr key={i}>
                    <Td colSpan={5}>
                      <Skeleton className="h-6" />
                    </Td>
                  </Tr>
                ))}
              {notes?.map((n) => (
                <Tr key={n.id}>
                  <Td>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Avatar name={n.authorName} size="sm" /> {n.authorName}
                    </span>
                  </Td>
                  <Td className="max-w-xs">
                    <p className="truncate font-medium">{n.title}</p>
                    {n.content && <p className="truncate text-xs text-fg-muted">{n.content}</p>}
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <Badge tone={n.done ? 'success' : 'warning'}>{n.done ? 'done' : 'open'}</Badge>
                  </Td>
                  <Td className="hidden whitespace-nowrap text-fg-muted md:table-cell">
                    {timeAgo(n.createdAt)}
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-danger"
                      aria-label="Remove note"
                      onClick={() => setDeleting(n)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Remove note?"
        description={
          deleting ? `"${deleting.title}" by ${deleting.authorName} will be deleted.` : undefined
        }
        confirmLabel="Remove"
      />
    </>
  );
}
