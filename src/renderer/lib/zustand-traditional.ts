import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

import { subscribeWithSelector } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';

type TraditionalMiddlewares = [['zustand/subscribeWithSelector', never]];

/**
 * Renderer stores that use `zustand/traditional` + `subscribeWithSelector`
 * (player, timestamp, auth) share this factory so middleware wiring stays consistent.
 */
export const createSubscribedTraditionalStore = <TState>() => {
    return <Mps extends [StoreMutatorIdentifier, unknown][] = []>(
        initializer: StateCreator<TState, TraditionalMiddlewares, Mps>,
    ) => createWithEqualityFn<TState>()(subscribeWithSelector(initializer));
};
