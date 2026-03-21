// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Spinner from './Spinner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const renderSpinnerRoutes = (path) => {
  render(
    <MemoryRouter initialEntries={['/current']}>
      <Routes>
        <Route path="/current" element={<Spinner {...(path ? { path } : {})} />} />
        <Route path="/login" element={<h2>Login Page</h2>} />
        <Route path="/dashboard" element={<h2>Dashboard Page</h2>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('Spinner component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders countdown correctly', () => {
    renderSpinnerRoutes('login');

    expect(
      screen.getByText((content) =>
        content.includes('redirecting to you in 3'),
      ),
    ).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(
      screen.getByText((content) =>
        content.includes('redirecting to you in 2'),
      ),
    ).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1000));
    expect(
      screen.getByText((content) =>
        content.includes('redirecting to you in 1'),
      ),
    ).toBeInTheDocument();
  });

  test('uses default path "login" when path prop is not provided', () => {
    renderSpinnerRoutes();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('heading', { name: 'Login Page' })).toBeInTheDocument();
  });

  test('navigates when countdown reaches 0', () => {
    renderSpinnerRoutes('login');

    act(() => jest.advanceTimersByTime(3000));

    expect(screen.getByRole('heading', { name: 'Login Page' })).toBeInTheDocument();
  });

  test('supports custom path prop', () => {
    renderSpinnerRoutes('dashboard');

    act(() => jest.advanceTimersByTime(3000));

    expect(screen.getByRole('heading', { name: 'Dashboard Page' })).toBeInTheDocument();
  });
});
