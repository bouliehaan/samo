import mergeWith from 'lodash/mergeWith';
export const deepMergeIntoState = (state, updates) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { actions, ...updatesWithoutActions } = updates;
    mergeWith(state, updatesWithoutActions, (_objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
            return srcValue;
        }
        return undefined;
    });
};
