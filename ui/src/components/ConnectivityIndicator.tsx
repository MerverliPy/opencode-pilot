import { colors, fonts } from '../theme';
import { useConnectivityStore } from '../store/connectivity';

export function ConnectivityIndicator() {
  const online = useConnectivityStore((s) => s.online);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 4px',
      marginTop: 'auto',
      borderTop: `1px solid ${colors.border}`,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: online ? colors.success : colors.error,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: fonts.sans,
        fontSize: 12,
        color: colors.muted,
      }}>
        {online ? 'Connected' : 'Offline'}
      </span>
    </div>
  );
}
