import { useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadLato } from '@remotion/google-fonts/Lato';

const { fontFamily: cinzel } = loadFont();
const { fontFamily: lato } = loadFont();

const GOLD = '#b8913a'; const DARK = '#0d0b08'; const PARCH = '#f7f2e8'; const MUTED = '#7a6e5f';

const SCENES = [
  { headline: 'There is a gap most pastors feel but rarely name.', body: 'You are responsible for the spiritual wellbeing of everyone in your congregation. Most weeks, you only know what they share on Sunday.' },
  { headline: 'What your congregation carries the rest of the week stays hidden.', body: 'The grief. The doubt. The fear. The questions they cannot find words for. Those stay private.' },
  { headline: 'DABAR gives them a place to bring those questions to Scripture.', body: 'Each day, your congregation brings what they are carrying. DABAR meets them with scripture-grounded reflection.' },
  { headline: 'You see what your congregation is actually wrestling with.', body: 'Each week you receive a quiet summary — anonymously, aggregated — of the themes your people have been sitting with. And a draft pastoral word grounded in those themes.' },
  { headline: 'Free for 90 days. No credit card. No strings.', body: 'dabarbible.com/pastor-access', isCta: true },
];

const SCENE_FRAMES = 540;

export const PastoralTrust: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneIndex = Math.min(Math.floor(frame / SCENE_FRAMES), SCENES.length - 1);
  const sceneFrame = frame - sceneIndex * SCENE_FRAMES;
  const scene = SCENES[sceneIndex] as typeof SCENES[0] & { isCta?: boolean };

  const fadeIn = interpolate(sceneFrame, [0, 45], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(sceneFrame, [SCENE_FRAMES - 45, SCENE_FRAMES], [1, 0], { extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);
  const headlineY = interpolate(sceneFrame, [0, 45], [20, 0], { extrapolateRight: 'clamp' });
  const bodyOp = interpolate(sceneFrame, [20, 65], [0, 1], { extrapolateRight: 'clamp' });
  const bodyY = interpolate(sceneFrame, [20, 65], [20, 0], { extrapolateRight: 'clamp' });
  const ruleWidth = interpolate(sceneFrame, [10, 60], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 120px', fontFamily: lato }}>
      <div style={{ position: 'absolute', top: 48, left: 80, fontFamily: cinzel, fontSize: 28, color: GOLD, letterSpacing: '0.25em', opacity: 0.7 }}>DABAR</div>
      <div style={{ position: 'absolute', bottom: 48, right: 80, display: 'flex', gap: 10 }}>
        {SCENES.map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === sceneIndex ? GOLD : MUTED, opacity: i === sceneIndex ? 1 : 0.4 }} />
        ))}
      </div>
      <div style={{ opacity, maxWidth: 900, textAlign: 'center' }}>
        <div style={{ height: 1, background: GOLD, width: `${ruleWidth}%`, margin: '0 auto 48px' }} />
        <div style={{ fontFamily: cinzel, fontSize: scene.isCta ? 52 : 44, color: scene.isCta ? GOLD : PARCH, lineHeight: 1.4, marginBottom: 36, transform: `translateY(${headlineY}px)` }}>
          {scene.headline}
        </div>
        {scene.body && (
          <div style={{ color: scene.isCta ? GOLD : MUTED, fontSize: scene.isCta ? 36 : 28, lineHeight: 1.7, opacity: bodyOp * opacity, transform: `translateY(${bodyY}px)`, fontFamily: scene.isCta ? cinzel : lato }}>
            {scene.body}
          </div>
        )}
        <div style={{ height: 1, background: GOLD, width: `${ruleWidth}%`, margin: '48px auto 0', opacity: 0.5 }} />
      </div>
    </div>
  );
};
