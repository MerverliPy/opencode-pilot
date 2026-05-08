import { Component, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '@/theme';
import { log } from '@/services/logger';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Top-level error boundary; renders a TUI-style crash screen with reset. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    log.error('ErrorBoundary', error.message, `${error.stack ?? ''}\n\nComponent stack:${info.componentStack}`);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
        <Text style={{ color: colors.error, fontFamily: fonts.mono, fontSize: fontSizes.lg, marginTop: 60 }}>
          ✕ something broke
        </Text>
        <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.xs, marginTop: 4 }}>
          pilot caught an unhandled exception
        </Text>
        <ScrollView
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 4,
            padding: 10,
            maxHeight: 320,
          }}
        >
          <Text selectable style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
            {error.message}
            {'\n\n'}
            {error.stack ?? ''}
          </Text>
        </ScrollView>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => ({
            marginTop: 16,
            alignSelf: 'flex-start',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: colors.background, fontFamily: fonts.mono, fontSize: fontSizes.sm, fontWeight: '600' }}>
            try again
          </Text>
        </Pressable>
      </View>
    );
  }
}
