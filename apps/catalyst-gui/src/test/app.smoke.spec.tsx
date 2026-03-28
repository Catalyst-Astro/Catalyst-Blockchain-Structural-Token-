import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import App from '@/App';
import { installMockCatalyst } from './mockCatalyst';

describe('GUI_APP_SMOKE', () => {
  beforeEach(() => {
    installMockCatalyst();
  });

  it('renders dashboard, operator, ui lab, and settings with a mocked Electron bridge', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Operations ledger')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Operator' }));
    expect(await screen.findByText('Clockchain Operator AI')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'UI Lab' }));
    expect(await screen.findByText('Web 4.0 Forge')).toBeInTheDocument();
    expect(await screen.findByText('Open UI case')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Activation')).toBeInTheDocument();
  });
});
