import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock global fetch with default responses
global.fetch = vi.fn((url) => {
  // Mock clientes endpoint
  if (url.includes('/clientes')) {
    return Promise.resolve({
      ok: true,
      json: async () => [],
      text: async () => '[]',
    });
  }
  
  // Mock productos endpoint
  if (url.includes('/productos')) {
    return Promise.resolve({
      ok: true,
      json: async () => [],
      text: async () => '[]',
    });
  }
  
  // Default mock
  return Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '{}',
  });
});

// Mock Image constructor
global.Image = class {
  set src(v) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};
