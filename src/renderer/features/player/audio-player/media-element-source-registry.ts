// `createMediaElementSource` may be called AT MOST ONCE for a given media
// element. A second call on the same element throws `InvalidStateError`, and
// the element stays bound to the node the first call produced — for the rest of
// its life, whatever happens to that node.
//
// That makes the "route this element into the graph" step stateful in a way no
// single component can own. Elements outlive the components that wire them:
// react-player reuses the same <audio> across URL changes, and the registry in
// `audio-element-registry.ts` deliberately keeps mounted elements registered so
// a reused DOM node stays controllable across a session switch. So the second
// component to see an element must be handed the node the first one made,
// rather than trying to make its own and swallowing the throw — because an
// element whose only source node has been disconnected is silent, permanently,
// and no amount of re-wiring can reach it again.
//
// A WeakMap keyed on the element is exactly that handoff: the node lives as long
// as the element does and no longer.
const SOURCES = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

/**
 * The graph node carrying `element`'s audio, creating it on first use.
 *
 * Returns `null` when the element is already bound to a DIFFERENT context —
 * unroutable by construction, since its audio belongs to that context forever.
 * In practice the app builds one context at startup and keeps it, so this only
 * guards a full renderer reload.
 */
export const getOrCreateMediaElementSource = (
    context: AudioContext,
    element: HTMLMediaElement,
): MediaElementAudioSourceNode | null => {
    const existing = SOURCES.get(element);

    if (existing) {
        return existing.context === context ? existing : null;
    }

    const source = context.createMediaElementSource(element);
    SOURCES.set(element, source);
    return source;
};
