import type { FlatState } from '../types';

/** Port: where the flat's state lives. Local today, a sync backend later. */
export interface FlatRepository {
  load(): Promise<FlatState | null>;
  save(state: FlatState): Promise<void>;
}
