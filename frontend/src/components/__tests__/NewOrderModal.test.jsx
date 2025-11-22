import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import NewOrderModal from '../NewOrderModal';

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

test('shows eye icon and opens preview modal on click', async () => {
  const onClose = vi.fn();
  render(<NewOrderModal open={true} onClose={onClose} editMode={true} order={{ code: 'T1', abono_image_url: '/uploads/comprobantes/test.png' }} />);

  // Eye button should be present
  const eyeBtn = await screen.findByRole('button', { name: /ver comprobante/i });
  expect(eyeBtn).toBeInTheDocument();

  // Click it - dispatches custom event 'open-comprobante-preview'
  const eventSpy = vi.fn();
  window.addEventListener('open-comprobante-preview', eventSpy);
  
  await userEvent.click(eyeBtn);

  // Verify event was dispatched
  expect(eventSpy).toHaveBeenCalled();
  
  window.removeEventListener('open-comprobante-preview', eventSpy);
});

test('renders file input for comprobante upload', async () => {
  render(<NewOrderModal open={true} onClose={() => {}} editMode={false} />);

  // The input is a file input; query by type
  const fileInput = document.querySelector('input[type="file"]');
  expect(fileInput).toBeInTheDocument();
});
