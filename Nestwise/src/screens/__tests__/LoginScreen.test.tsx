import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { authApi } from '../../services/api';
import auth from '../../store/authSlice';
import flat from '../../store/flatSlice';
import { LoginScreen } from '../auth/LoginScreen';

jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  authApi: { login: jest.fn() },
  setTokens: jest.fn(async () => {}),
}));

const nav = { navigate: jest.fn() };
async function setup() {
  const store = configureStore({ reducer: { auth, flat } });
  await render(
    <Provider store={store}>
      <LoginScreen navigation={nav as never} route={{ key: 'Login', name: 'Login' } as never} />
    </Provider>,
  );
  return store;
}

test('asks for email and password before calling the server', async () => {
  await setup();
  await fireEvent.press(screen.getByText('Log in'));
  expect(screen.getByText('Enter your email and password.')).toBeTruthy();
  expect(authApi.login).not.toHaveBeenCalled();
});

test('shows the server error on wrong credentials', async () => {
  jest.mocked(authApi.login).mockRejectedValueOnce(new Error('Email or password is incorrect.'));
  await setup();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'wrongpass');
  await fireEvent.press(screen.getByText('Log in'));
  expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
});

test('successful login stores the user', async () => {
  jest.mocked(authApi.login).mockResolvedValueOnce({
    accessToken: 'a', refreshToken: 'r', accessExpiresAt: '', user: { id: 'u', email: 'a@b.co', name: 'A' },
  });
  const store = await setup();
  await fireEvent.changeText(screen.getByLabelText('Email'), ' a@b.co ');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'rightpass');
  await fireEvent.press(screen.getByText('Log in'));
  await waitFor(() => expect(store.getState().auth.user?.name).toBe('A'));
  expect(authApi.login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'rightpass' });
});

test('links go to register and forgot password', async () => {
  await setup();
  await fireEvent.press(screen.getByText('New here? Create an account'));
  await fireEvent.press(screen.getByText('Forgot password?'));
  expect(nav.navigate).toHaveBeenCalledWith('Register');
  expect(nav.navigate).toHaveBeenCalledWith('ForgotPassword');
});
