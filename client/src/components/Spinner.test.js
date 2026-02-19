import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Spinner from './Spinner';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';

jest.useFakeTimers();

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/current' };

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

describe('Spinner component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders countdown correctly', () => {
    render(
      <MemoryRouter>
        <Spinner path="login" />
      </MemoryRouter>,
    );

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
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>,
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: '/current',
    });
  });

  test('navigates when countdown reaches 0', () => {
    render(
      <MemoryRouter>
        <Spinner path="login" />
      </MemoryRouter>,
    );

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: '/current',
    });
  });

  test('supports custom path prop', () => {
    render(
      <MemoryRouter>
        <Spinner path="dashboard" />
      </MemoryRouter>,
    );

    act(() => jest.advanceTimersByTime(3000));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
      state: '/current',
    });
  });
});
