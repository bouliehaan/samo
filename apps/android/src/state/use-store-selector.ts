import { useRef, useSyncExternalStore } from 'react';

import { androidLog } from '../utils/log';

/**
 * The one subscribe-with-a-selector every module store hands out.
 *
 * All five stores are the same shape — a module-level value, a Set of
 * listeners, and a hook that runs a selector over it through
 * `useSyncExternalStore` — and they had five copies of this three-line hook.
 * That is fine right up until the copies need a fix, which is what this is.
 *
 * WHAT MAKES A SELECTOR SAFE, AND WHY IT IS EASY TO GET WRONG
 *
 * `useSyncExternalStore` re-runs `getSnapshot` on EVERY notification from the
 * store and keeps the component only if the result is `Object.is`-equal to last
 * time. These stores are coarse: one `appNavigationState` object holds home
 * content, the library, search, the detail stack and the view-all route
 * together, so a single keystroke in the search field notifies all forty-odd
 * subscribers in the app.
 *
 * That is harmless today only because every selector in the codebase returns a
 * primitive or an existing reference, so `Object.is` holds and React bails out.
 * The moment one returns something FRESH — `state.a && state.b` is fine, but
 * `{ a: state.a }`, `items.filter(...)`, or `?? []` with a new literal is not —
 * that component starts re-rendering on every unrelated store write anywhere in
 * the app, and React may additionally warn that the snapshot is uncached and
 * loop. Neither symptom points at the selector that caused it.
 *
 * So the trap is closed here instead of documented: in dev the selector is run
 * twice against the same state on first render, and a result that fails to come
 * back identical is reported immediately, at the component that wrote it. The
 * check is `__DEV__`-only and happens once per hook instance, so it costs one
 * extra selector call in development and literally nothing in release.
 */
export function useStoreSelector<State, Selected>(
    subscribe: (listener: () => void) => () => void,
    getState: () => State,
    selector: (state: State) => Selected,
): Selected {
    const getSelected = () => selector(getState());

    const hasCheckedRef = useRef(false);
    if (__DEV__ && !hasCheckedRef.current) {
        hasCheckedRef.current = true;
        // Same state in, so anything but the same value out means the selector
        // is allocating — see the note above for what that costs.
        if (!Object.is(getSelected(), getSelected())) {
            androidLog.error(
                'A store selector returned a new value for unchanged state, so its ' +
                    'component will now re-render on EVERY write to that store. Return a ' +
                    'primitive or an existing reference, and derive objects/arrays with ' +
                    'useMemo in the component instead.',
            );
        }
    }

    return useSyncExternalStore(subscribe, getSelected, getSelected);
}
