import { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { colors, fonts } from '@/theme';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Braille-pattern spinner matching the OpenCode TUI. */
export function Spinner({ color = colors.accent, style }: { color?: string; style?: TextStyle }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={[{ color, fontFamily: fonts.mono, fontSize: 14 }, style]}>
      {FRAMES[i]}
    </Text>
  );
}
