import { Composition } from 'remotion';
import { SocialAcquisition } from './compositions/SocialAcquisition';
import { WhatsAppCard } from './compositions/WhatsAppCard';
import { PastoralTrust } from './compositions/PastoralTrust';

export const RemotionRoot = () => (
  <>
    <Composition
      id="SocialAcquisition"
      component={SocialAcquisition}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        verseRef: 'Psalm 46:1',
        verseText: 'God is our refuge and strength, an ever-present help in trouble.',
        reflectionPrompt: 'What are you carrying into this week?',
        theme: 'anxiety_and_fear',
      }}
    />
    <Composition
      id="WhatsAppCard"
      component={WhatsAppCard}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{
        verseRef: 'Psalm 46:1',
        verseText: 'God is our refuge and strength, an ever-present help in trouble.',
        theme: 'anxiety_and_fear',
      }}
    />
    <Composition
      id="PastoralTrust"
      component={PastoralTrust}
      durationInFrames={2700}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  </>
);
