import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { ConfirmProvider, useConfirm } from '@/context/ConfirmContext';
import {
  AddForm,
  Button,
  CardHeader,
  CardTitle,
  ClearableInput,
  CommitInput,
  CommitTextarea,
  DragHandle,
  FormField,
  Input,
  Salute,
  Switch,
  Tooltip,
} from '.';

describe('UI components', () => {
  it('Button shows a spinner and is disabled while loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: /save/i });
    expect(btn).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('FormField links label and error to its control', () => {
    render(
      <FormField label="Email" error="Required">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });

  it('Switch toggles', async () => {
    const onChange = vi.fn();
    render(<Switch label="Dark" checked={false} onCheckedChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('CommitInput saves once on Enter, only when changed', async () => {
    const onCommit = vi.fn();
    render(<CommitInput aria-label="Name" value="Ada" onCommit={onCommit} />);
    const input = screen.getByLabelText('Name');
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
    await userEvent.type(input, 'm{Enter}');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Adam');
  });

  it('CommitInput reverts on Escape and follows value while idle', async () => {
    const onCommit = vi.fn();
    const { rerender } = render(<CommitInput aria-label="Name" value="Ada" onCommit={onCommit} />);
    const input = screen.getByLabelText('Name');
    await userEvent.type(input, 'xyz{Escape}');
    expect(input).toHaveValue('Ada');
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
    rerender(<CommitInput aria-label="Name" value="Grace" onCommit={onCommit} />);
    expect(input).toHaveValue('Grace');
  });

  it('CommitTextarea saves a pending draft on unmount', async () => {
    const onCommit = vi.fn();
    const { unmount } = render(<CommitTextarea aria-label="Bio" value="" onCommit={onCommit} />);
    await userEvent.type(screen.getByLabelText('Bio'), 'line 1{Enter}line 2');
    expect(onCommit).not.toHaveBeenCalled();
    unmount();
    expect(onCommit).toHaveBeenCalledWith('line 1\nline 2');
  });

  it('ClearableInput shows the clear button only with onClear', async () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <ClearableInput aria-label="Limit" value={5} onCommit={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    rerender(<ClearableInput aria-label="Limit" value={5} onCommit={() => {}} onClear={onClear} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('AddForm trims, and clears only after a truthy onAdd', async () => {
    const onAdd = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<AddForm placeholder="New thing" label="Add" onAdd={onAdd} />);
    const input = screen.getByLabelText('New thing');
    await userEvent.type(input, '  milk  {Enter}');
    expect(onAdd).toHaveBeenLastCalledWith('milk');
    expect(input).toHaveValue('  milk  ');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(input).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it('Tooltip align="end" pins it to the right edge', () => {
    render(
      <Tooltip content="Tip" align="end">
        <button>Hi</button>
      </Tooltip>,
    );
    expect(screen.getByText('Tip')).toHaveClass('right-0');
  });

  it('useConfirm resolves with the choice', async () => {
    function Demo() {
      const confirm = useConfirm();
      const [answer, setAnswer] = useState('none');
      return (
        <>
          <button onClick={async () => setAnswer(String(await confirm({ title: 'Sure?' })))}>
            Ask
          </button>
          <p>answer: {answer}</p>
        </>
      );
    }
    render(
      <ConfirmProvider>
        <Demo />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('answer: true')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('answer: false')).toBeInTheDocument();
  });

  it('DragHandle is a named button that passes the hook handlers on, in a CardHeader grip', async () => {
    const onKeyDown = vi.fn();
    render(
      <CardHeader grip={<DragHandle label="Move Alpha" onKeyDown={onKeyDown} />}>
        <CardTitle>Alpha</CardTitle>
      </CardHeader>,
    );
    const grip = screen.getByRole('button', { name: 'Move Alpha' });
    expect(grip).toHaveAttribute('title', 'Move Alpha');
    expect(grip).toHaveClass('touch-none');
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    grip.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe('Salute', () => {
  it('draws on a hidden canvas and calls onDone when finished', () => {
    vi.useFakeTimers();
    // jsdom has no canvas: the animation is skipped, only the timer runs.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onDone = vi.fn();
    const { container } = render(<Salute text="Done" onDone={onDone} />);
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden');
    vi.advanceTimersByTime(1000);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onDone).toHaveBeenCalledOnce();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
