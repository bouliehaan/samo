import { Text, useWindowDimensions, View } from 'react-native';
import Reanimated, { FadeIn } from 'react-native-reanimated';

import { colors } from '../../theme/tokens';
import { WaveDotsField } from './WaveDotsField';

/**
 * Shown for the brief window between JS mount and the saved-session decision, so
 * neither an empty Home nor the onboarding welcome flashes before we know which
 * to show. Shares the dot field with the welcome step for a seamless hand-off.
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
            <Reanimated.View entering={FadeIn.duration(500)}>
                <Text
                    style={{
                        color: colors.text,
                        fontFamily: 'YoungSerif-Bold',
                        fontSize: 44,
                        letterSpacing: -0.5,
                    }}
                >
                    Samo
                </Text>
            </Reanimated.View>
        </View>
    );
};
