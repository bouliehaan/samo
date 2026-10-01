import 'react-native';

/**
 * Android's explicit D-pad neighbours. React Native carries these on every
 * view (Fabric's Android HostPlatformViewProps and ReactViewManager both read
 * them) and Pressable forwards them to its view, but the TypeScript
 * definitions only list them on the legacy Touchables. The value is the native
 * tag of the view focus moves to in that direction.
 */
declare module 'react-native' {
    interface ViewPropsAndroid {
        nextFocusDown?: number | undefined;
        nextFocusForward?: number | undefined;
        nextFocusLeft?: number | undefined;
        nextFocusRight?: number | undefined;
        nextFocusUp?: number | undefined;
    }
}
