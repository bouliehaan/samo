import {
    createContext,
    memo,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    findNodeHandle,
    Pressable,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type ViewStyle,
} from 'react-native';

import { noteTvBlur, noteTvFocus, shouldTvZoneTakeFocus, type TvZone } from './tv-focus';
import { takeTvLongPressClick } from './tv-keys';
import { resolveTvFocus } from './tv-navigation';
import { tvStyles as s } from './tv-styles';

/** How a control takes focus when its scope places it there, and withdraws a
 *  request that has not landed. Each kind of control knows its own way. */
type FocusTarget = { release: () => void; take: () => void };

type FocusScopeApi = {
    active: boolean;
    /** Move focus to this scope's remembered control, or its default. */
    enter: () => void;
    /** Move focus on the person's behalf, as a keyboard's Next key does. */
    focus: (id: string) => void;
    forget: (id: string) => void;
    register: (id: string, target: FocusTarget) => () => void;
    remember: (id: string) => void;
    retryPlacement: () => void;
    zone: TvZone;
};

const FocusScopeContext = createContext<FocusScopeApi | null>(null);
const scopesByName = new Map<string, FocusScopeApi>();

/** Send focus into a named scope — its remembered control, else its default. */
export const enterTvScope = (name: string): boolean => {
    const scope = scopesByName.get(name);
    scope?.enter();
    return scope !== undefined;
};

/** Move focus to one control of a named scope. */
export const focusTvControl = (scopeName: string, id: string): void => {
    scopesByName.get(scopeName)?.focus(id);
};

/**
 * Places focus for one surface, using Android's native spatial focus for every
 * move in between. No D-pad key is intercepted to move focus.
 *
 * A scope places focus only when it has a reason to: it was just shown (and
 * `autoPlace`), it was asked to (`enter`, `focus`), or the control holding focus
 * was removed out from under the person. Otherwise it leaves focus where the
 * person put it — including in another scope, which is how the rail and the
 * page beside it coexist without either pulling focus back.
 *
 * What it places is the person's last choice in it when that is still there,
 * else `defaultFocus`, else the first control registered. So closing a detail
 * returns to the tile that opened it, and a control that arrives late (a
 * discovered server, a row that loads) still receives focus.
 *
 * Telling the person's moves from Android's is the subtle part. Android moves
 * focus by itself whenever the focused view is hidden or removed, and those
 * moves arrive through the same onFocus a D-pad press does. So while a
 * placement is pending, focus events are the system settling, not a choice.
 */
export function TvFocusScope({
    active = true,
    autoPlace = true,
    children,
    defaultFocus,
    forceInitialFocus = false,
    name,
    zone = 'content',
}: {
    active?: boolean;
    /** Place focus whenever this surface is shown. Off for the rail, which
     *  only takes focus when the person moves there or asks. */
    autoPlace?: boolean;
    children: ReactNode;
    defaultFocus: string;
    /** Newly opened details own focus even if hiding the old page made Android
     * temporarily move it to the rail. Later returns still restore the zone. */
    forceInitialFocus?: boolean;
    /** For `enterTvScope` / `focusTvControl`. */
    name?: string;
    zone?: TvZone;
}) {
    const targets = useRef(new Map<string, FocusTarget>());
    const scope = useRef({
        active,
        autoPlace,
        /** The control the person last moved to here. */
        choice: null as string | null,
        defaultFocus,
        /** The control focused here now, as focus events tell it. */
        focused: null as string | null,
        frame: null as ReturnType<typeof requestAnimationFrame> | null,
        retryTimer: null as ReturnType<typeof setTimeout> | null,
        attempts: 0,
        /** A placement of ours whose focus event has not arrived yet. */
        placing: null as string | null,
        /** This scope owes focus a placement. */
        wantsPlacement: false,
    });

    const settle = useCallback(() => {
        const state = scope.current;
        if (state.frame !== null) cancelAnimationFrame(state.frame);
        if (state.retryTimer !== null) clearTimeout(state.retryTimer);
        state.retryTimer = null;
        state.frame = requestAnimationFrame(() => {
            state.frame = null;
            if (!state.active || !state.wantsPlacement) return;
            const id = resolveTvFocus(
                [...targets.current.keys()],
                state.choice,
                state.defaultFocus,
            );
            const target = id ? targets.current.get(id) : undefined;
            if (!id || !target) return;
            // A placement that never landed must not stay armed behind this one.
            if (state.placing !== null && state.placing !== id) {
                targets.current.get(state.placing)?.release();
                state.placing = null;
            }
            if (id === state.focused) {
                // Already there (Android often gets there first), so no focus
                // event is coming to confirm the placement: count it now.
                state.wantsPlacement = false;
                return;
            }
            state.placing = id;
            target.take();
            // Fabric/FlatList may register a control before Android lays out
            // its now-visible surface. Retry only an unacknowledged placement;
            // onFocus stops this, so it cannot pull focus back from the user.
            if (++state.attempts < 16) {
                state.retryTimer = setTimeout(settle, 60);
            } else {
                state.wantsPlacement = false;
                target.release();
            }
        });
    }, []);

    const register = useCallback(
        (id: string, target: FocusTarget) => {
            targets.current.set(id, target);
            if (scope.current.wantsPlacement) settle();
            return () => {
                targets.current.delete(id);
                const state = scope.current;
                if (state.placing === id) state.placing = null;
                if (state.focused === id) {
                    // Removed while it held focus: Android is about to move
                    // focus somewhere of its own choosing. Place it here
                    // instead — from the default, since the choice is gone.
                    if (state.choice === id) state.choice = null;
                    state.focused = null;
                    state.wantsPlacement = state.active;
                    settle();
                }
            };
        },
        [settle],
    );

    const remember = useCallback((id: string) => {
        const state = scope.current;
        // Covered, this surface only receives focus while Android clears it
        // off the controls being hidden, never because someone chose one.
        if (!state.active) return;
        state.focused = id;
        if (id === state.placing) {
            state.placing = null;
            state.wantsPlacement = false;
            return;
        }
        if (!state.wantsPlacement) state.choice = id;
    }, []);

    const forget = useCallback((id: string) => {
        const state = scope.current;
        if (state.focused === id) state.focused = null;
    }, []);

    const enter = useCallback(() => {
        scope.current.attempts = 0;
        scope.current.wantsPlacement = scope.current.active;
        settle();
    }, [settle]);

    const focus = useCallback(
        (id: string) => {
            // Their move, made through something other than the D-pad.
            scope.current.choice = id;
            enter();
        },
        [enter],
    );

    // A layout effect so `active` is current during the commit that hides this
    // surface, before the native focus events that commit causes can arrive.
    useLayoutEffect(() => {
        const state = scope.current;
        const wasActive = state.active;
        state.active = active;
        state.autoPlace = autoPlace;
        state.defaultFocus = defaultFocus;
        if (!active && wasActive) {
            // Covered: focus is leaving for whatever covers this surface, and
            // must be placed again, from the person's choice, when it returns.
            if (state.placing !== null) targets.current.get(state.placing)?.release();
            state.placing = null;
            state.focused = null;
            state.wantsPlacement = false;
        } else if (active && !wasActive) {
            state.attempts = 0;
            state.wantsPlacement = autoPlace && shouldTvZoneTakeFocus(zone);
            settle();
        }
    }, [active, autoPlace, defaultFocus, settle, zone]);

    // Shown from the first render: place once the controls arrive.
    useLayoutEffect(() => {
        if (
            scope.current.active &&
            scope.current.autoPlace &&
            (forceInitialFocus || shouldTvZoneTakeFocus(zone))
        ) {
            scope.current.wantsPlacement = true;
            settle();
        }
        // Mount only: later showings are the effect above.
    }, [settle]);

    useEffect(
        () => () => {
            const { frame } = scope.current;
            if (frame !== null) cancelAnimationFrame(frame);
            if (scope.current.retryTimer !== null) clearTimeout(scope.current.retryTimer);
        },
        [],
    );

    const api = useMemo<FocusScopeApi>(
        () => ({ active, enter, focus, forget, register, remember, retryPlacement: settle, zone }),
        [active, enter, focus, forget, register, remember, settle, zone],
    );

    useEffect(() => {
        if (!name) return;
        scopesByName.set(name, api);
        return () => {
            if (scopesByName.get(name) === api) scopesByName.delete(name);
        };
    }, [api, name]);

    return <FocusScopeContext.Provider value={api}>{children}</FocusScopeContext.Provider>;
}

type TvPressableProps = {
    children: ReactNode | ((focused: boolean) => ReactNode);
    disabled?: boolean;
    /** Styles applied while focused, over `style`. */
    focusedStyle?: StyleProp<ViewStyle>;
    id: string;
    label: string;
    onFocusChange?: (focused: boolean) => void;
    onLongPress?: () => void;
    onPress: () => void;
    /** Hold D-pad focus on this control in these directions: the arrow then
     *  only reaches key listeners (a seek bar, a slider), and a menu's edges
     *  stop focus escaping to the page behind it. */
    pin?: TvFocusPin;
    selected?: boolean;
    style?: StyleProp<ViewStyle>;
};

export type TvFocusPin = { down?: boolean; left?: boolean; right?: boolean; up?: boolean };

/**
 * The one focusable control on the TV. A plain view takes focus through
 * `hasTVPreferredFocus`, and that request outlives the moment it was made:
 * Fabric keeps setNativeProps values on the node and re-applies them with
 * every later update, each time as a fresh requestFocus. Left armed, a control
 * that was placed once pulls focus back whenever it re-renders (its own blur
 * restyles it), and two such controls pass focus between themselves. So the
 * request is withdrawn the moment focus arrives or leaves. (View's imperative
 * focus() would not linger, but in this React Native it sits behind a feature
 * flag that is off.)
 */
export const TvPressable = memo(function TvPressable({
    children,
    disabled = false,
    focusedStyle,
    id,
    label,
    onFocusChange,
    onLongPress,
    onPress,
    pin,
    selected = false,
    style,
}: TvPressableProps) {
    const scope = useContext(FocusScopeContext);
    const ref = useRef<View>(null);
    const [focused, setFocused] = useState(false);
    // Pinning names this view as its own next focus in a direction, which
    // needs its native tag — known only once it is mounted.
    const [selfTag, setSelfTag] = useState<number | undefined>(undefined);
    const pinned = pin !== undefined;
    useEffect(() => {
        if (pinned) setSelfTag(findNodeHandle(ref.current) ?? undefined);
    }, [pinned]);
    const armed = useRef(false);
    // Read at key time, so a re-render with a new handler never needs to
    // re-announce focus.
    const latest = useRef({ onFocusChange, onLongPress, onPress });
    latest.current = { onFocusChange, onLongPress, onPress };

    const release = useCallback(() => {
        if (!armed.current) return;
        armed.current = false;
        ref.current?.setNativeProps({ hasTVPreferredFocus: false });
    }, []);
    const register = scope?.register;
    useEffect(() => {
        if (!ref.current || disabled || !register) return;
        return register(id, {
            release,
            take: () => {
                armed.current = true;
                ref.current?.setNativeProps({ hasTVPreferredFocus: true });
            },
        });
    }, [disabled, id, register, release]);

    const zone = scope?.zone ?? 'content';
    const handleFocus = useCallback(() => {
        release();
        setFocused(true);
        scope?.remember(id);
        noteTvFocus({
            id,
            onPress: () => latest.current.onPress(),
            onLongPress: latest.current.onLongPress
                ? () => latest.current.onLongPress?.()
                : undefined,
            zone,
        });
        latest.current.onFocusChange?.(true);
    }, [id, release, scope, zone]);
    const handleBlur = useCallback(() => {
        release();
        setFocused(false);
        scope?.forget(id);
        noteTvBlur(id);
        latest.current.onFocusChange?.(false);
    }, [id, release, scope]);
    const handlePress = useCallback(() => {
        // A held OK that became a long press must not also click on release.
        if (takeTvLongPressClick()) return;
        latest.current.onPress();
    }, []);

    return (
        <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessible={scope?.active ?? true}
            accessibilityState={{ disabled: disabled || scope?.active === false, selected }}
            disabled={disabled || scope?.active === false}
            // Covered surfaces stay mounted to preserve browsing state, but
            // must leave Android's spatial focus graph while an overlay is up.
            // Android retains focusability for accessible views even when
            // focusable=false, so accessible/disabled must agree with it.
            focusable={!disabled && (scope?.active ?? true)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onLayout={scope?.retryPlacement}
            onPress={handlePress}
            nextFocusDown={pin?.down ? selfTag : undefined}
            nextFocusLeft={pin?.left ? selfTag : undefined}
            nextFocusRight={pin?.right ? selfTag : undefined}
            nextFocusUp={pin?.up ? selfTag : undefined}
            ref={ref}
            style={[style, focused && focusedStyle, disabled && s.disabled]}
        >
            {typeof children === 'function' ? children(focused) : children}
        </Pressable>
    );
});

/** A text (or icon) button: the TV's pill, inverting to ink when focused. */
export function TvButton({
    children,
    disabled,
    id,
    label,
    onLongPress,
    onPress,
    pin,
    primary = false,
    selected = false,
    style,
}: {
    children?: ReactNode | ((focused: boolean) => ReactNode);
    disabled?: boolean;
    id: string;
    label: string;
    onLongPress?: () => void;
    onPress: () => void;
    pin?: TvFocusPin;
    primary?: boolean;
    selected?: boolean;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <TvPressable
            disabled={disabled}
            focusedStyle={s.buttonFocused}
            id={id}
            label={label}
            onLongPress={onLongPress}
            onPress={onPress}
            pin={pin}
            selected={selected}
            style={[s.button, primary && s.buttonPrimary, selected && s.buttonSelected, style]}
        >
            {(focused) =>
                typeof children === 'function' ? (
                    children(focused)
                ) : children !== undefined ? (
                    children
                ) : (
                    <Text
                        numberOfLines={1}
                        style={[
                            s.buttonText,
                            primary && s.buttonTextPrimary,
                            focused && s.buttonTextFocused,
                        ]}
                    >
                        {label}
                    </Text>
                )
            }
        </TvPressable>
    );
}

export function TvTextInput({
    id,
    label,
    next,
    ...props
}: TextInputProps & {
    id: string;
    label: string;
    /** The field the keyboard's Next key moves to. An open TV keyboard owns
     *  the D-pad, so without it the only way on is closing the keyboard. */
    next?: string;
}) {
    const scope = useContext(FocusScopeContext);
    const ref = useRef<TextInput>(null);
    const [focused, setFocused] = useState(false);
    const register = scope?.register;
    useEffect(() => {
        if (!ref.current || props.editable === false || !register) return;
        // A text field's focus() is a one-off command, so there is nothing to
        // withdraw. (On a TV it focuses the field; the keyboard opens when the
        // field is selected.)
        return register(id, { release: () => undefined, take: () => ref.current?.focus() });
    }, [register, id, props.editable]);
    const zone = scope?.zone ?? 'content';
    return (
        <View style={s.field}>
            <Text style={s.muted}>{label}</Text>
            <TextInput
                returnKeyType={next ? 'next' : undefined}
                submitBehavior={next ? 'submit' : undefined}
                {...props}
                onSubmitEditing={next ? () => scope?.focus(next) : props.onSubmitEditing}
                ref={ref}
                focusable={scope?.active ?? true}
                accessible={scope?.active ?? true}
                editable={props.editable !== false && (scope?.active ?? true)}
                accessibilityLabel={label}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => {
                    setFocused(true);
                    scope?.remember(id);
                    noteTvFocus({ id, zone });
                }}
                onBlur={() => {
                    setFocused(false);
                    scope?.forget(id);
                    noteTvBlur(id);
                }}
                placeholderTextColor={s.placeholder.color}
                style={[s.input, focused && s.inputFocused]}
            />
        </View>
    );
}

/**
 * An invisible, full-height focus target on the seam between the rail and the
 * content. It is always the nearest thing across that seam, so every sideways
 * move between the two lands here first — and it hands focus on: into the
 * content's remembered control when arriving from the rail, and to the rail's
 * current page when arriving from the content. That is how both directions
 * return to where the person was, instead of wherever Android's geometry
 * happens to land.
 */
export function TvFocusGuide({
    onFocus,
    style,
}: {
    onFocus: () => void;
    style: StyleProp<ViewStyle>;
}) {
    return (
        <View
            accessible={false}
            focusable
            importantForAccessibility="no"
            onFocus={onFocus}
            style={style}
        />
    );
}
