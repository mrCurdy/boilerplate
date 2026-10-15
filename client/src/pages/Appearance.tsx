import { Check, Globe, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE,
  FONTS,
  type Appearance,
  type FontKey,
} from '@app/shared';
import { RoleGate } from '@/components/auth/ProtectedRoute';
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
  ConfirmDialog,
  FormField,
  Input,
  Select,
  Slider,
  Switch,
} from '@/components/ui';
import { useAppearance } from '@/context/AppearanceContext';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';

const hueGradient = (c: number) =>
  `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => `oklch(0.65 ${Math.max(c, 0.12)} ${i * 30})`).join(', ')})`;

const same = (a: Appearance, b: Appearance) =>
  (Object.keys(a) as (keyof Appearance)[]).every((k) => a[k] === b[k]);

const MODES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardBody className="flex flex-col gap-5">{children}</CardBody>
    </Card>
  );
}

export default function AppearancePage() {
  const {
    appearance: a,
    site,
    customized,
    update,
    resetLocal,
    publish,
    resetSite,
  } = useAppearance();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [confirmPublish, setConfirmPublish] = useState(false);

  return (
    <>
      <PageHeader
        title="Appearance"
        description="Change global design parameters. Every page updates live, because all components read the same tokens."
        actions={
          <Button
            variant="outline"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            disabled={!customized}
            onClick={resetLocal}
          >
            Reset to site default
          </Button>
        }
      />

      {customized && (
        <Alert tone="info" className="mb-6" title="You're previewing your own appearance">
          Your changes are saved in this browser only.{' '}
          <RoleGate minRole="admin" fallback={null}>
            As an admin you can publish them as the default for everyone.
          </RoleGate>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Group title="Presets" description="Starting points. Fine-tune anything below.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {APPEARANCE_PRESETS.map((p) => {
                const active = same(p.appearance, a);
                const {
                  brandHue: h,
                  brandChroma: c,
                  neutralHue: nh,
                  neutralTint: nt,
                } = p.appearance;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => update(p.appearance)}
                    aria-pressed={active}
                    className={cn(
                      'focus-ring relative flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-surface-2',
                      active ? 'border-primary ring-1 ring-primary' : 'border-border',
                    )}
                  >
                    <div className="flex gap-1">
                      <span
                        className="h-6 flex-1 rounded-sm"
                        style={{ background: `oklch(0.51 ${c} ${h})` }}
                      />
                      <span
                        className="h-6 flex-1 rounded-sm"
                        style={{ background: `oklch(0.95 ${c * 0.13} ${h})` }}
                      />
                      <span
                        className="h-6 flex-1 rounded-sm"
                        style={{ background: `oklch(0.21 ${0.02 * nt} ${nh})` }}
                      />
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ fontFamily: FONTS[p.appearance.font].stack }}
                    >
                      {p.name}
                    </span>
                    <span className="text-xs text-fg-muted">{FONTS[p.appearance.font].label}</span>
                    {active && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </Group>

          <Group
            title="Color"
            description="Brand color drives buttons, links, focus rings and highlights. Neutrals tint backgrounds and text."
          >
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Mode</span>
              <div
                className="inline-flex w-fit gap-1 rounded-lg bg-surface-2 p-1"
                role="radiogroup"
                aria-label="Color mode"
              >
                {MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      'focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                      theme === value
                        ? 'bg-surface text-fg shadow-card'
                        : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <Slider
              label="Brand hue"
              min={0}
              max={360}
              value={a.brandHue}
              onValueChange={(brandHue) => update({ brandHue })}
              format={(v) => `${v}°`}
              trackStyle={{ background: hueGradient(a.brandChroma) }}
            />
            <Slider
              label="Brand saturation"
              min={0}
              max={0.3}
              step={0.01}
              value={a.brandChroma}
              onValueChange={(brandChroma) => update({ brandChroma })}
              format={(v) => `${Math.round((v / 0.3) * 100)}%`}
              trackStyle={{
                background: `linear-gradient(to right, oklch(0.55 0 0), oklch(0.55 0.3 ${a.brandHue}))`,
              }}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Slider
                label="Neutral hue"
                min={0}
                max={360}
                value={a.neutralHue}
                onValueChange={(neutralHue) => update({ neutralHue })}
                format={(v) => `${v}°`}
                trackStyle={{ background: hueGradient(0.12) }}
              />
              <Slider
                label="Neutral tint"
                min={0}
                max={4}
                step={0.1}
                value={a.neutralTint}
                onValueChange={(neutralTint) => update({ neutralTint })}
                format={(v) => (v === 0 ? 'pure gray' : `${v.toFixed(1)}×`)}
              />
            </div>
            <Button
              variant="link"
              size="sm"
              className="w-fit"
              onClick={() => update({ neutralHue: a.brandHue })}
            >
              Match neutrals to brand hue
            </Button>
          </Group>

          <Group title="Typography">
            <FormField label="Font family" hint="Web fonts load from Google Fonts on demand.">
              <Select
                value={a.font}
                onChange={(e) => update({ font: e.target.value as FontKey })}
                options={Object.entries(FONTS).map(([value, f]) => ({ value, label: f.label }))}
              />
            </FormField>
            <Slider
              label="Base font size"
              min={12}
              max={20}
              value={a.fontSize}
              onValueChange={(fontSize) => update({ fontSize })}
              format={(v) => `${v}px`}
            />
          </Group>

          <Group title="Shape & spacing">
            <Slider
              label="Corner radius"
              min={0}
              max={2.5}
              step={0.1}
              value={a.radius}
              onValueChange={(radius) => update({ radius })}
              format={(v) => (v === 0 ? 'square' : `${v.toFixed(1)}×`)}
            />
            <Slider
              label="Density"
              min={0.75}
              max={1.25}
              step={0.05}
              value={a.density}
              onValueChange={(density) => update({ density })}
              format={(v) =>
                v < 0.95
                  ? `compact ${v.toFixed(2)}×`
                  : v > 1.05
                    ? `roomy ${v.toFixed(2)}×`
                    : 'default'
              }
            />
            <Slider
              label="Shadow strength"
              min={0}
              max={3}
              step={0.1}
              value={a.shadow}
              onValueChange={(shadow) => update({ shadow })}
              format={(v) => (v === 0 ? 'flat' : `${v.toFixed(1)}×`)}
            />
          </Group>

          <RoleGate minRole="admin">
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Site default <Badge tone="primary">admin</Badge>
                </CardTitle>
                <CardDescription>
                  The default applies to every visitor without their own overrides, including
                  signed-out users. Publishing pushes it live to everyone online over Socket.io.
                </CardDescription>
              </CardHeader>
              <CardBody className="text-sm text-fg-muted">
                Current site default:{' '}
                <strong className="text-fg">{site ? 'custom' : 'built-in'}</strong>
                {site && same(site, a) && ' (matches what you see)'}
              </CardBody>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!site}
                  onClick={() =>
                    resetSite().then(
                      () => toast.success('Site default reset to built-in'),
                      (err) => toast.error('Failed', errorMessage(err)),
                    )
                  }
                >
                  Revert to built-in
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Upload className="h-4 w-4" />}
                  disabled={!!site && same(site, a)}
                  onClick={() => setConfirmPublish(true)}
                >
                  Publish current as default
                </Button>
              </CardFooter>
            </Card>
          </RoleGate>
        </div>

        <aside className="lg:sticky lg:top-0 lg:self-start">
          <Preview />
        </aside>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        danger={false}
        title="Publish site-wide appearance?"
        description="Everyone without personal overrides will see this appearance immediately."
        confirmLabel="Publish"
        onConfirm={() =>
          publish().then(
            () => toast.success('Published', 'The new appearance is live for everyone.'),
            (err) => toast.error('Publish failed', errorMessage(err)),
          )
        }
      />
    </>
  );
}

/** A compact sample of real components so changes are visible without leaving the page. */
function Preview() {
  const [on, setOn] = useState(true);
  const { appearance } = useAppearance();
  const changed = !same(appearance, DEFAULT_APPEARANCE);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">Live preview</p>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar name="Ada Lovelace" online />
            <div>
              <CardTitle>Ada Lovelace</CardTitle>
              <CardDescription>ada@example.com</CardDescription>
            </div>
            <Badge tone="primary" className="ml-auto">
              admin
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <FormField label="Project name" hint="Shown on your dashboard">
            <Input defaultValue="Analytical Engine" />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox label="Public" defaultChecked />
            <Switch label="Notifications" checked={on} onCheckedChange={setOn} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">active</Badge>
            <Badge tone="warning">pending</Badge>
            <Badge tone="info">beta</Badge>
            <Badge tone="danger">blocked</Badge>
          </div>
          <p className="text-sm text-fg-muted">
            Body text in the selected font.{' '}
            <a className="font-medium text-primary hover:underline">A link</a> uses the brand color.
          </p>
        </CardBody>
        <CardFooter>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button variant="outline" size="sm">
            Draft
          </Button>
          <Button size="sm">Save</Button>
        </CardFooter>
      </Card>
      <Alert
        tone={changed ? 'success' : 'info'}
        title={changed ? 'Custom appearance' : 'Default appearance'}
      >
        Navigate anywhere: the whole app uses these settings.
      </Alert>
    </div>
  );
}
