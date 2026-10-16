import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Field } from '../Field';

test('password fields hide text until the eye is pressed', async () => {
  await render(<Field label="Password" value="secret" secureTextEntry />);
  const input = screen.getByLabelText('Password');
  expect(input.props.secureTextEntry).toBe(true);
  await fireEvent.press(screen.getByLabelText('Show password'));
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  await fireEvent.press(screen.getByLabelText('Hide password'));
  expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
});

test('plain fields have no eye button', async () => {
  await render(<Field label="Email" value="" />);
  expect(screen.queryByLabelText('Show password')).toBeNull();
});
