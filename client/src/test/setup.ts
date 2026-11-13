import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library can't unmount between tests by itself.
afterEach(cleanup);

// Older jsdom builds lack <dialog> methods; enough for <Modal> to open and close.
const dialog = HTMLDialogElement.prototype;
dialog.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
dialog.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
