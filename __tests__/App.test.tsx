/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders the demo flat', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('Sunrise Apartment');
  await ReactTestRenderer.act(async () => tree.unmount());
});
