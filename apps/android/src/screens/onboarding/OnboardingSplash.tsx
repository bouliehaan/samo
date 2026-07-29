import { useWindowDimensions, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { WaveDotsField } from './WaveDotsField';

/**
 * Shown for the brief window between JS mount and the saved-session decision, so
 * neither an empty Home nor the onboarding welcome flashes before we know which
 * to show. Shares the dot field with the welcome step for a seamless hand-off.
 *
 * Deliberately UNBRANDED: this is a hand-off, not a title card. A wordmark here
 * splashed the app's own name at someone who just opened the app — on every
 * launch, not only the first — which is the kind of thing a player should never
 * do. The dot field alone covers the window and still hands off to welcome.
 */
export const OnboardingSplash = () => {
    const { width, height } = useWindowDimensions();

    return (
        <View
            style={{
                alignItems: 'center',
                backgroundColor: colors.background,
                flex: 1,
                justifyContent: 'center',
            }}
        >
            <WaveDotsField focusY={0.5} height={height} intensity={0.7} width={width} />
        </View>
    );
};
