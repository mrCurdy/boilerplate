import {
  Bell,
  ChevronRight,
  Copy,
  Inbox,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Dropdown,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tooltip,
  Tr,
  Tabs,
  Textarea,
} from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

const SECTIONS = [
  'Tokens',
  'Buttons',
  'Forms',
  'Feedback',
  'Data display',
  'Overlays',
  'Layout',
] as const;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

function Section({
  title,
  description,
  children,
}: {
  title: (typeof SECTIONS)[number];
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={slug(title)} className="scroll-mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">{label}</p>
        <div className={className ?? 'flex flex-wrap items-center gap-3'}>{children}</div>
      </CardBody>
    </Card>
  );
}

const COLOR_TOKENS = [
  'bg',
  'surface',
  'surface-2',
  'border',
  'fg',
  'fg-muted',
  'primary',
  'primary-soft',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'info',
  'info-soft',
];

export default function UiKit() {
  const { resolved, setTheme } = useTheme();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [switchOn, setSwitchOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(40);

  return (
    <>
      <PageHeader
        title="UI Kit"
        description="The style system: semantic tokens in styles/index.css + composable components in components/ui."
        actions={
          <Switch
            label="Dark mode"
            checked={resolved === 'dark'}
            onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
          />
        }
      />

      <nav className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s}
            href={`#${slug(s)}`}
            className="focus-ring rounded-full border border-border px-3 py-1 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            {s}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-12">
        <Section
          title="Tokens"
          description="Use semantic utilities (bg-surface, text-fg-muted, bg-primary…). Never raw palette colors."
        >
          <Demo label="Colors" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {COLOR_TOKENS.map((t) => (
              <div key={t} className="flex flex-col gap-1.5">
                <div
                  className="h-12 rounded-md border border-border"
                  style={{ background: `var(--${t})` }}
                />
                <code className="text-xs text-fg-muted">{t}</code>
              </div>
            ))}
          </Demo>
          <Demo label="Typography" className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tracking-tight">Heading 3xl</p>
            <p className="text-2xl font-semibold tracking-tight">Heading 2xl</p>
            <p className="text-lg font-semibold">Heading lg</p>
            <p className="text-base">Body base — The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-fg-muted">
              Muted sm — Secondary information and descriptions.
            </p>
            <code className="font-mono text-sm">font-mono — const answer = 42;</code>
          </Demo>
          <Demo label="Radius & shadow">
            {(['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'] as const).map((r) => (
              <div
                key={r}
                className={`flex h-16 w-24 items-center justify-center border border-border bg-surface-2 text-xs ${r}`}
              >
                {r}
              </div>
            ))}
            <div className="flex h-16 w-24 items-center justify-center rounded-md bg-surface text-xs shadow-card">
              shadow-card
            </div>
            <div className="flex h-16 w-24 items-center justify-center rounded-md bg-surface text-xs shadow-pop">
              shadow-pop
            </div>
          </Demo>
        </Section>

        <Section
          title="Buttons"
          description="<Button variant size loading leftIcon rightIcon block />"
        >
          <Demo label="Variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </Demo>
          <Demo label="Sizes & icons">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button leftIcon={<Plus className="h-4 w-4" />}>New item</Button>
            <Button variant="outline" rightIcon={<ChevronRight className="h-4 w-4" />}>
              Next
            </Button>
            <Tooltip content="Settings">
              <Button variant="outline" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Tooltip>
          </Demo>
          <Demo label="States">
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            >
              {loading ? 'Saving…' : 'Click to load'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </Demo>
        </Section>

        <Section
          title="Forms"
          description="<FormField> wires label, hint, error and aria attributes onto any control."
        >
          <Demo label="Fields" className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" hint="We'll never share it." required>
              <Input type="email" placeholder="you@example.com" leftIcon={<Mail />} />
            </FormField>
            <FormField label="Username" error="That username is taken.">
              <Input defaultValue="admin" />
            </FormField>
            <FormField label="Role">
              <Select
                defaultValue=""
                placeholder="Pick a role…"
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'moderator', label: 'Moderator' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </FormField>
            <FormField label="Search">
              <Input placeholder="Search…" leftIcon={<Search />} />
            </FormField>
            <FormField label="Bio" hint="Markdown supported" className="sm:col-span-2">
              <Textarea placeholder="Tell us about yourself" />
            </FormField>
            <FormField label="Disabled">
              <Input disabled value="Can't touch this" readOnly />
            </FormField>
          </Demo>
          <Demo label="Choices">
            <Checkbox label="Remember me" defaultChecked />
            <Checkbox label="Disabled" disabled />
            <Switch label="Notifications" checked={switchOn} onCheckedChange={setSwitchOn} />
            <Switch label="Disabled" checked={false} onCheckedChange={() => {}} disabled />
          </Demo>
          <Demo label="Slider" className="grid gap-5 sm:grid-cols-2">
            <Slider
              label="Volume"
              min={0}
              max={100}
              value={volume}
              onValueChange={setVolume}
              format={(v) => `${v}%`}
            />
            <Slider
              label="Disabled"
              min={0}
              max={100}
              value={60}
              onValueChange={() => {}}
              disabled
            />
          </Demo>
        </Section>

        <Section
          title="Feedback"
          description="Alerts for inline messages, toasts for transient ones, spinners and skeletons for loading."
        >
          <Demo label="Alerts" className="grid gap-3">
            <Alert tone="info" title="Heads up">
              A new version is available.
            </Alert>
            <Alert tone="success" title="Saved">
              Your changes have been saved.
            </Alert>
            <Alert tone="warning" title="Careful">
              This action affects all users.
            </Alert>
            <Alert tone="danger" title="Error">
              Something went wrong. Please try again.
            </Alert>
          </Demo>
          <Demo label="Toasts (useToast)">
            <Button
              variant="outline"
              onClick={() => toast.success('Saved', 'Your note was created.')}
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.error('Failed', 'Network request failed.')}
            >
              Error toast
            </Button>
            <Button variant="outline" onClick={() => toast.info('FYI', 'Something happened.')}>
              Info toast
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.toast({ tone: 'warning', title: 'Low disk space' })}
            >
              Warning toast
            </Button>
          </Demo>
          <Demo label="Loading">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" className="text-primary" />
            <div className="flex w-64 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Demo>
        </Section>

        <Section title="Data display" description="Badges, avatars, tables and empty states.">
          <Demo label="Badges">
            <Badge>Neutral</Badge>
            <Badge tone="primary">Primary</Badge>
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="danger">Danger</Badge>
            <Badge tone="info">Info</Badge>
            <Badge tone="primary" outline>
              Outline
            </Badge>
          </Demo>
          <Demo label="Avatars">
            <Avatar name="Ada Lovelace" size="sm" />
            <Avatar name="Grace Hopper" />
            <Avatar name="Linus Torvalds" size="lg" />
            <Avatar name="Online User" online />
            <Avatar name="Away User" online={false} />
          </Demo>
          <Card>
            <Table>
              <THead>
                <Tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {[
                  { name: 'Ada Lovelace', role: 'admin', status: 'Active' },
                  { name: 'Grace Hopper', role: 'moderator', status: 'Active' },
                  { name: 'Alan Turing', role: 'user', status: 'Invited' },
                ].map((u) => (
                  <Tr key={u.name}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar name={u.name} size="sm" /> {u.name}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          u.role === 'admin'
                            ? 'primary'
                            : u.role === 'moderator'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {u.role}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={u.status === 'Active' ? 'success' : 'warning'}>{u.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      <Dropdown
                        trigger={(p) => (
                          <Button {...p} variant="ghost" size="icon-sm" aria-label="Row actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                        items={[
                          {
                            label: 'Edit',
                            icon: <Pencil />,
                            onSelect: () => toast.info(`Edit ${u.name}`),
                          },
                          {
                            label: 'Copy ID',
                            icon: <Copy />,
                            onSelect: () => toast.info('Copied'),
                          },
                          'separator',
                          {
                            label: 'Delete',
                            icon: <Trash2 />,
                            danger: true,
                            onSelect: () => toast.error(`Deleted ${u.name}`),
                          },
                        ]}
                      />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>
          <Card>
            <EmptyState
              icon={<Inbox />}
              title="No messages yet"
              description="When you receive messages they will show up here."
              action={
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Compose
                </Button>
              }
            />
          </Card>
        </Section>

        <Section title="Overlays" description="Modal (native <dialog>), Dropdown, Tooltip.">
          <Demo label="Modal & dropdown">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Confirm dialog
            </Button>
            <Dropdown
              align="start"
              trigger={(p) => (
                <Button
                  {...p}
                  variant="outline"
                  rightIcon={<ChevronRight className="h-4 w-4 rotate-90" />}
                >
                  Dropdown
                </Button>
              )}
              items={[
                { label: 'Notifications', icon: <Bell />, onSelect: () => {} },
                { label: 'Settings', icon: <Settings />, onSelect: () => {} },
                { label: 'Disabled', disabled: true, onSelect: () => {} },
              ]}
            />
            <Tooltip content="I'm a tooltip">
              <Button variant="ghost">Hover me</Button>
            </Tooltip>
          </Demo>
        </Section>

        <Section title="Layout" description="Cards and tabs for structuring content.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Cards compose Header / Body / Footer.</CardDescription>
              </CardHeader>
              <CardBody className="text-sm text-fg-muted">
                Use cards to group related information. They adapt to the theme automatically.
              </CardBody>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button size="sm">Save</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardBody>
                <Tabs
                  value={tab}
                  onValueChange={setTab}
                  items={[
                    {
                      value: 'overview',
                      label: 'Overview',
                      content: (
                        <p className="text-sm text-fg-muted">
                          Overview content. Use ← → keys to switch tabs.
                        </p>
                      ),
                    },
                    {
                      value: 'activity',
                      label: 'Activity',
                      content: (
                        <p className="text-sm text-fg-muted">Recent activity would be here.</p>
                      ),
                    },
                    {
                      value: 'settings',
                      label: 'Settings',
                      content: (
                        <Switch
                          label="Enable feature"
                          checked={switchOn}
                          onCheckedChange={setSwitchOn}
                        />
                      ),
                    },
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit profile"
        description="Changes are saved when you click save."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false);
                toast.success('Profile updated');
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="Name">
            <Input defaultValue="Ada Lovelace" />
          </FormField>
          <FormField label="Bio">
            <Textarea defaultValue="First programmer." />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="sm"
        title="Delete item?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmOpen(false);
                toast.error('Item deleted');
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
