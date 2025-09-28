import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewOrderModal from '../NewOrderModal';

// Mocks: normalize behavior for fetch and Image
beforeEach(() => {
  global.fetch = jest.fn();
  // Mock Image constructor behavior
  global.Image = class {
    set src(v) {
      // Simulate successful load after a short tick
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  };
});

afterEach(() => {
  jest.resetAllMocks();
});

test('shows eye icon and opens preview modal on click', async () => {
  const onClose = jest.fn();
  render(<NewOrderModal open={true} onClose={onClose} editMode={true} order={{ code: 'T1', abono_image_url: '/uploads/comprobantes/test.png' }} />);

  // Eye button should be present
  const eyeBtn = await screen.findByRole('button', { name: /ver comprobante/i });
  expect(eyeBtn).toBeInTheDocument();

  // Click it
  userEvent.click(eyeBtn);

  // Modal preview should appear
  await waitFor(() => expect(screen.getByAltText(/preview/i)).toBeInTheDocument());
});

test('uploads a file and updates form via API', async () => {
  const file = new File(['abc'], 'test.png', { type: 'image/png' });
  // Mock fetch upload response
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ url: '/uploads/comprobantes/test.png' }) });

  render(<NewOrderModal open={true} onClose={() => {}} editMode={false} />);

  const input = screen.getByLabelText(/comprobante de abono/i) || screen.getByRole('textbox', { hidden: true });
  // The input is a file input; query by type
  const fileInput = document.querySelector('input[type="file"]');
  expect(fileInput).toBeInTheDocument();

  // Fire change event
  await waitFor(() => fireEvent.change(fileInput, { target: { files: [file] } }));

  // Ensure fetch was called
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});
