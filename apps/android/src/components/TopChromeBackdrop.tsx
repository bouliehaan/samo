import { BlurView } from 'expo-blur';
import { Image, StyleSheet, View } from 'react-native';

import chromeFinishTop from '../../assets/chrome-finish-top.png';
import { styles } from '../theme/styles';
import { chromeGlass } from '../theme/tokens';

/**
 * The Home top bar's glass pane — the dock's material (see
 * BottomChromeBackdrop for the full recipe, the graphics laws, and why the
 * finish is a baked pre-dithered PNG) mirrored to the top edge. Same
 * in-blur dim/chroma (chromeGlass), same black smoke, same baked finish
 * family. Content scrolls beneath it; the floating header row
 * (styles.homeHeaderFloating) rides on top as plain ink.
 */
export const TopChromeBackdrop = () => (
    <View pointerEvents="none" style={styles.topChrome}>
        <BlurView
            {...chromeGlass}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
            tint="systemChromeMaterialDark"
        />
        <View style={[StyleSheet.absoluteFill, styles.chromeSmoke]} />
        <Image
            accessibilityIgnoresInvertColors
            fadeDuration={0}
            resizeMode="stretch"
            source={chromeFinishTop}
            style={StyleSheet.absoluteFill}
        />
    </View>
);
