import mergeWith from 'lodash/mergeWith';

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const deepMergeIntoState = <T extends Record<string, unknown>>(
    state: T,
    updates: DeepPartial<T>,
): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { actions, ...updatesWithoutActions } = updates as T & { actions?: unknown };

    mergeWith(state, updatesWithoutActions, (_objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
            return srcValue;
        }

        return undefined;
    });
};
