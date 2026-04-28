import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadLato } from '@remotion/google-fonts/Lato';

const { fontFamily: cinzel } = loadFont();
const { fontFamily: lato } = loadFont();

const GOLD = '#b8913a'; const DARK = '#0d0b08'; const PARCH = '#f7f2e8'; const MUTED = '#7a6e5f';

interface Props { verseRef: string; verseText: string; theme: string; }

export const WhatsAppCard: React.FC<Props> = ({ verseRef, verseText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const labelY = interpolate(frame, [0, 25], [-30, 0], { extrapolateRight: 'clamp' });
  const ruleWidth = interpolate(frame, [25, 65], [0, 100], { extrapolateRight: 'clamp' });
  const verseOpacity = interpolate(frame, [55, 90], [0, 1], { extrapolateRight: 'clamp' });
  const verseY = interpolate(frame, [55, 90], [25, 0], { extrapolateRight: 'clamp' });
  const refScale = spring({ frame: frame - 170, fps, config: { damping: 200 } });
  const refOpacity = interpolate(frame, [168, 185], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [260, 295], [0, 1], { extrapolateRight: 'clamp' });
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.05);

  return (
    <div style={{ width: '100%', height: '100%', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '72px', fontFamily: lato, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 52, opacity: labelOpacity, transform: `translateY(${labelY}px)`, fontFamily: cinzel, fontSize: 28, color: GOLD, letterSpacing: '0.3em' }}>DABAR</div>
      <div style={{ position: 'absolute', top: 100, height: 1, background: GOLD, width: `${ruleWidth}%`, opacity: pulse }} />
      <div style={{ opacity: verseOpacity, transform: `translateY(${verseY}px)`, textAlign: 'center', maxWidth: 860 }}>
        <div style={{ fontFamily: cinzel, fontSize: 50, color: PARCH, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 44 }}>"{verseText}"</div>
        <div style={{ opacity: refOpacity, transform: `scale(${refScale})`, color: GOLD, fontSize: 34, fontFamily: cinzel, letterSpacing: '0.1em' }}>— {verseRef}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 100, height: 1, background: GOLD, width: `${ruleWidth}%`, opacity: pulse }} />
      <div style={{ position: 'absolute', bottom: 48, opacity: ctaOpacity, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ color: MUTED, fontSize: 22 }}>Reflect daily at</div>
        <div style={{ color: GOLD, fontSize: 22, fontFamily: cinzel, letterSpacing: '0.1em' }}>dabarbible.com</div>
      </div>
    </div>
  );
};
