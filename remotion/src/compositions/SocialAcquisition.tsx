import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadLato } from '@remotion/google-fonts/Lato';

const { fontFamily: cinzel } = loadFont();
const { fontFamily: lato } = loadFont();

const GOLD = '#b8913a';
const DARK = '#0d0b08';
const PARCH = '#f7f2e8';
const MUTED = '#7a6e5f';

interface Props {
  verseRef: string;
  verseText: string;
  reflectionPrompt: string;
  theme: string;
}

export const SocialAcquisition: React.FC<Props> = ({ verseRef }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0], { extrapolateRight: 'clamp' });

  const question = "I feel like God is distant. How do I pray when I can't feel Him?";
  const qOpacity = interpolate(frame, [88, 105], [0, 1], { extrapolateRight: 'clamp' });
  const qChars = Math.floor(interpolate(frame - 95, [0, 120], [0, question.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));

  const lines = [
    'The Psalms are full of this exact prayer.',
    'David asked "Why are you so far from saving me?"',
    'Feeling distant is not the same as being far.',
    'Psalm 22 begins in anguish and ends in praise.',
    `"My God, my God, why have you forsaken me?" — ${verseRef}`,
  ];
  const rStart = 300;
  const lineDelay = 60;
  const getChars = (text: string, i: number) =>
    text.slice(0, Math.floor(interpolate(frame - rStart - i * lineDelay, [0, 80], [0, text.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })));

  const ctaOpacity = interpolate(frame, [720, 750], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: frame - 720, fps, config: { damping: 200 } });

  return (
    <div style={{ width: '100%', height: '100%', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 60px', fontFamily: lato, position: 'relative' }}>
      {frame < 95 && (
        <div style={{ opacity: logoOpacity, textAlign: 'center', position: 'absolute' }}>
          <div style={{ fontFamily: cinzel, fontSize: 96, color: GOLD, letterSpacing: '0.15em' }}>DABAR</div>
          <div style={{ color: MUTED, fontSize: 26, marginTop: 16, letterSpacing: '0.2em' }}>SCRIPTURE · REFLECTION</div>
        </div>
      )}
      {frame >= 88 && frame < 310 && (
        <div style={{ opacity: qOpacity, position: 'absolute', top: 160, width: '100%', padding: '0 60px' }}>
          <div style={{ color: MUTED, fontSize: 20, marginBottom: 20, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Someone asked DABAR...</div>
          <div style={{ color: PARCH, fontSize: 46, lineHeight: 1.45, fontFamily: cinzel, fontStyle: 'italic', borderLeft: `4px solid ${GOLD}`, paddingLeft: 28 }}>
            {question.slice(0, qChars)}
            {frame < 215 && qChars < question.length && <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>|</span>}
          </div>
        </div>
      )}
      {frame >= 298 && frame < 730 && (
        <div style={{ position: 'absolute', top: 110, width: '100%', padding: '0 60px', opacity: interpolate(frame, [298, 312], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <div style={{ color: GOLD, fontSize: 18, letterSpacing: '0.12em', marginBottom: 24, textTransform: 'uppercase' }}>DABAR responded</div>
          {lines.map((line, i) => (
            <div key={i} style={{ color: i === 4 ? GOLD : PARCH, fontSize: i === 4 ? 32 : 36, lineHeight: 1.5, marginBottom: 20, fontFamily: i === 4 ? cinzel : lato, fontStyle: i === 4 ? 'italic' : 'normal', opacity: frame >= rStart + i * lineDelay ? 1 : 0 }}>
              {getChars(line, i)}
            </div>
          ))}
        </div>
      )}
      {frame >= 720 && (
        <div style={{ opacity: ctaOpacity, transform: `scale(${ctaScale})`, textAlign: 'center', position: 'absolute' }}>
          <div style={{ fontFamily: cinzel, fontSize: 60, color: GOLD, letterSpacing: '0.15em', marginBottom: 20 }}>DABAR</div>
          <div style={{ color: PARCH, fontSize: 30, marginBottom: 20, lineHeight: 1.5 }}>Bring your questions to Scripture.</div>
          <div style={{ background: GOLD, color: DARK, padding: '18px 56px', fontSize: 28, fontWeight: 700, letterSpacing: '0.1em' }}>dabarbible.com</div>
          <div style={{ color: MUTED, fontSize: 20, marginTop: 18 }}>Free 30-day trial · No credit card</div>
        </div>
      )}
    </div>
  );
};
