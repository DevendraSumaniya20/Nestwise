import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import type { FlatRepository } from '../services/FlatRepository';
import type { FlatState } from '../types';

const KEY = 'flat';

export class AsyncStorageFlatRepository implements FlatRepository {
  private storage = createAsyncStorage('nestwise');

  async load(): Promise<FlatState | null> {
    const raw = await this.storage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlatState;
    // Unknown versions are ignored rather than crashing the app.
    return parsed?.version === 1 ? parsed : null;
  }

  save(state: FlatState): Promise<void> {
    return this.storage.setItem(KEY, JSON.stringify(state));
  }
}
