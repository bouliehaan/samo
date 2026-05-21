export function createTableScrollShadowStore() {
    let snapshot = {
        showLeftShadow: false,
        showRightShadow: false,
        showTopShadow: false,
    };
    const listeners = new Set();
    return {
        getSnapshot: () => snapshot,
        setSnapshot: (patch) => {
            const next = { ...snapshot, ...patch };
            if (next.showLeftShadow === snapshot.showLeftShadow &&
                next.showRightShadow === snapshot.showRightShadow &&
                next.showTopShadow === snapshot.showTopShadow) {
                return;
            }
            snapshot = next;
            listeners.forEach((l) => l());
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
