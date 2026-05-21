import {
    Component,
    type ErrorInfo,
    type ReactNode,
} from 'react';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import { androidLog } from '../utils/log';
import { styles } from '../theme/styles';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    label: string;
}

interface ErrorBoundaryState {
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        androidLog.warn(`[${this.props.label}] caught render error`, {
            error,
            stack: info.componentStack,
        });
    }

    private handleRetry = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry);
            }

            return (
                <View style={styles.errorBoundaryRoot}>
                    <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
                    <Text style={styles.errorBoundarySubtitle}>{this.state.error.message}</Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={this.handleRetry}
                        style={styles.errorBoundaryButton}
                    >
                        <Text style={styles.errorBoundaryButtonText}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}
