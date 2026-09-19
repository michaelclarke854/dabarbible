// Hand-written public question pages. Every word here is written by hand:
// no generated copy, no invented numbers, ratings or testimonials.
// Scripture is quoted from the public-domain King James Version (1769).

export interface QuestionPassage {
  /** Display reference, e.g. "Psalms 34:18" */
  ref: string;
  /** Book name exactly as it appears in the KJV book list */
  book: string;
  chapter: number;
  /** KJV text of the quoted verse(s) */
  text: string;
  /** One hand-written line of framing, in the product's voice */
  note: string;
}

export interface QuestionPage {
  slug: string;
  /** The single H1 */
  question: string;
  metaDescription: string;
  /** Two or three sentences of framing before the scripture */
  intro: string[];
  passages: QuestionPassage[];
  /** Closing framing before the invitation */
  closing: string;
  related: string[];
}

const bookSlugMap: Record<string, string> = {};
export function bookToSlug(book: string): string {
  if (bookSlugMap[book]) return bookSlugMap[book];
  const slug = book.toLowerCase().replace(/\s+/g, "-");
  bookSlugMap[book] = slug;
  return slug;
}

export const questionPages: QuestionPage[] = [
  {
    slug: "what-does-the-bible-say-about-anxiety",
    question: "What does the Bible say about anxiety?",
    metaDescription:
      "KJV passages on anxiety, with plain framing and no platitudes. Scripture quoted from the public-domain King James Version (1769).",
    intro: [
      "Scripture does not treat anxious people as weak believers. It speaks to them directly, often in the middle of real danger.",
      "These passages are quoted in full so you can read them yourself rather than take a summary of them.",
    ],
    passages: [
      {
        ref: "Philippians 4:6-7",
        book: "Philippians",
        chapter: 4,
        text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
        note: "The instruction is not to feel differently but to speak — to make the request known.",
      },
      {
        ref: "1 Peter 5:7",
        book: "1 Peter",
        chapter: 5,
        text: "Casting all your care upon him; for he careth for you.",
        note: "Care is something carried. This verse assumes you are already carrying it.",
      },
      {
        ref: "Psalms 94:19",
        book: "Psalms",
        chapter: 94,
        text: "In the multitude of my thoughts within me thy comforts delight my soul.",
        note: "A multitude of thoughts is named here without rebuke.",
      },
      {
        ref: "Matthew 6:34",
        book: "Matthew",
        chapter: 6,
        text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.",
        note: "The day is enough. Tomorrow is not yours to carry yet.",
      },
      {
        ref: "Isaiah 41:10",
        book: "Isaiah",
        chapter: 41,
        text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
        note: "The reason given is presence, not a promise that the circumstance will change.",
      },
    ],
    closing:
      "If anxiety is affecting your sleep, your body or your ability to work, that is worth telling a doctor. Scripture and care are not rivals.",
    related: [
      "what-does-the-bible-say-about-fear",
      "what-does-the-bible-say-about-worry-about-money",
      "what-does-the-bible-say-about-trusting-god-in-uncertainty",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-grief",
    question: "What does the Bible say about grief?",
    metaDescription:
      "KJV passages on grief and loss, quoted in full, with framing that does not rush you. Public-domain King James Version (1769).",
    intro: [
      "Scripture grieves out loud. It does not hurry mourners along, and it does not explain their loss away.",
      "Read these slowly. There is no lesson to extract before you are ready.",
    ],
    passages: [
      {
        ref: "Psalms 34:18",
        book: "Psalms",
        chapter: 34,
        text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.",
        note: "Nearness is the promise. Not repair, and not speed.",
      },
      {
        ref: "Psalms 147:3",
        book: "Psalms",
        chapter: 147,
        text: "He healeth the broken in heart, and bindeth up their wounds.",
        note: "Binding up is slow work, done to something that is still open.",
      },
      {
        ref: "John 11:35",
        book: "John",
        chapter: 11,
        text: "Jesus wept.",
        note: "He wept at a grave he was about to open. Grief was not made unnecessary by the outcome.",
      },
      {
        ref: "Revelation 21:4",
        book: "Revelation",
        chapter: 21,
        text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.",
        note: "This is written as a future, not as a reason to stop crying now.",
      },
      {
        ref: "Matthew 5:4",
        book: "Matthew",
        chapter: 5,
        text: "Blessed are they that mourn: for they shall be comforted.",
        note: "Mourning is the condition being blessed, not the thing being corrected.",
      },
    ],
    closing:
      "Grief has no schedule. If it has become something you cannot carry alone, telling one person is a real step.",
    related: [
      "what-does-the-bible-say-about-loneliness",
      "what-does-the-bible-say-about-hope",
      "what-does-the-bible-say-about-anxiety",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-fear",
    question: "What does the Bible say about fear?",
    metaDescription:
      "KJV passages on fear, quoted in full, with plain framing. Public-domain King James Version (1769).",
    intro: [
      "Fear appears constantly in scripture, usually spoken to people who had good reason to be afraid.",
      "Notice what is offered each time: not a reassurance that nothing is wrong, but company.",
    ],
    passages: [
      {
        ref: "Psalms 27:1",
        book: "Psalms",
        chapter: 27,
        text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?",
        note: "Written as a question the writer is still asking himself.",
      },
      {
        ref: "Psalms 56:3",
        book: "Psalms",
        chapter: 56,
        text: "What time I am afraid, I will trust in thee.",
        note: "Trust and fear occupy the same sentence here.",
      },
      {
        ref: "Joshua 1:9",
        book: "Joshua",
        chapter: 1,
        text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
        note: "Spoken to a man taking on something larger than himself.",
      },
      {
        ref: "2 Timothy 1:7",
        book: "2 Timothy",
        chapter: 1,
        text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
        note: "A sound mind is named as a gift, not a demand.",
      },
      {
        ref: "Deuteronomy 31:6",
        book: "Deuteronomy",
        chapter: 31,
        text: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.",
        note: "The ground of the courage is who goes with them.",
      },
    ],
    closing:
      "Fear that never lifts, or that keeps you from ordinary life, is worth naming to someone qualified to help.",
    related: [
      "what-does-the-bible-say-about-anxiety",
      "what-does-the-bible-say-about-trusting-god-in-uncertainty",
      "what-does-the-bible-say-about-courage",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-loneliness",
    question: "What does the Bible say about loneliness?",
    metaDescription:
      "KJV passages for loneliness, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Loneliness in scripture is rarely solved in a verse. It is more often accompanied.",
      "These passages speak to being unseen, left, or far from home.",
    ],
    passages: [
      {
        ref: "Psalms 25:16",
        book: "Psalms",
        chapter: 25,
        text: "Turn thee unto me, and have mercy upon me; for I am desolate and afflicted.",
        note: "Desolate is the writer's own word for himself.",
      },
      {
        ref: "Psalms 68:6",
        book: "Psalms",
        chapter: 68,
        text: "God setteth the solitary in families: he bringeth out those which are bound with chains: but the rebellious dwell in a dry land.",
        note: "The remedy offered is other people.",
      },
      {
        ref: "Hebrews 13:5",
        book: "Hebrews",
        chapter: 13,
        text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.",
        note: "Two negatives held together: never leave, never forsake.",
      },
      {
        ref: "Isaiah 43:2",
        book: "Isaiah",
        chapter: 43,
        text: "When thou passest through the waters, I will be with thee; and through the rivers, they shall not overflow thee: when thou walkest through the fire, thou shalt not be burned; neither shall the flame kindle upon thee.",
        note: "Through, not around.",
      },
      {
        ref: "Psalms 139:7-8",
        book: "Psalms",
        chapter: 139,
        text: "Whither shall I go from thy spirit? or whither shall I flee from thy presence? If I ascend up into heaven, thou art there: if I make my bed in hell, behold, thou art there.",
        note: "There is no distance far enough to be out of reach.",
      },
    ],
    closing:
      "If the isolation has lasted a long time, one small contact with a real person this week is worth more than another page read alone.",
    related: [
      "what-does-the-bible-say-about-grief",
      "what-does-the-bible-say-about-feeling-far-from-god",
      "what-does-the-bible-say-about-hope",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-forgiveness",
    question: "What does the Bible say about forgiveness?",
    metaDescription:
      "KJV passages on forgiving others and being forgiven, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Forgiveness in scripture is commanded, but it is never described as easy or as pretending nothing happened.",
      "Read the passages before deciding what they ask of you.",
    ],
    passages: [
      {
        ref: "Ephesians 4:32",
        book: "Ephesians",
        chapter: 4,
        text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
        note: "The measure given is what has already been received.",
      },
      {
        ref: "Colossians 3:13",
        book: "Colossians",
        chapter: 3,
        text: "Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.",
        note: "Forbearing comes first — carrying the other person before the release.",
      },
      {
        ref: "Matthew 18:21-22",
        book: "Matthew",
        chapter: 18,
        text: "Then came Peter to him, and said, Lord, how oft shall my brother sin against me, and I forgive him? till seven times? Jesus saith unto him, I say not unto thee, Until seven times: but, Until seventy times seven.",
        note: "Peter's question assumes a limit. The answer removes the counting.",
      },
      {
        ref: "Mark 11:25",
        book: "Mark",
        chapter: 11,
        text: "And when ye stand praying, forgive, if ye have ought against any: that your Father also which is in heaven may forgive you your trespasses.",
        note: "Forgiveness is placed inside prayer, not as a separate errand.",
      },
      {
        ref: "1 John 1:9",
        book: "1 John",
        chapter: 1,
        text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.",
        note: "The condition is confession, not performance.",
      },
    ],
    closing:
      "Forgiving someone is not the same as returning to an unsafe situation. If safety is part of your question, take that to someone who can help you with it directly.",
    related: [
      "what-does-the-bible-say-about-anger",
      "what-does-the-bible-say-about-guilt-and-shame",
      "what-does-the-bible-say-about-bitterness",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-purpose",
    question: "What does the Bible say about purpose?",
    metaDescription:
      "KJV passages about purpose and calling, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture speaks about purpose less as a career and more as a direction of life.",
      "These verses are often quoted in fragments. Here they are whole.",
    ],
    passages: [
      {
        ref: "Jeremiah 29:11",
        book: "Jeremiah",
        chapter: 29,
        text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
        note: "Written to people in exile, with no quick way home.",
      },
      {
        ref: "Proverbs 19:21",
        book: "Proverbs",
        chapter: 19,
        text: "There are many devices in a man's heart; nevertheless the counsel of the LORD, that shall stand.",
        note: "Plans are not forbidden here. They are simply not final.",
      },
      {
        ref: "Ephesians 2:10",
        book: "Ephesians",
        chapter: 2,
        text: "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.",
        note: "Walking, not discovering — the works are already laid down.",
      },
      {
        ref: "Micah 6:8",
        book: "Micah",
        chapter: 6,
        text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?",
        note: "The clearest statement of purpose in scripture is three things, and none of them are a job title.",
      },
      {
        ref: "Romans 8:28",
        book: "Romans",
        chapter: 8,
        text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
        note: "Work together — over time, and not each thing on its own.",
      },
    ],
    closing:
      "If you cannot see your purpose right now, the passages above do not make that a failure.",
    related: [
      "what-does-the-bible-say-about-waiting-on-god",
      "what-does-the-bible-say-about-starting-over",
      "what-does-the-bible-say-about-doubt",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-doubt",
    question: "What does the Bible say about doubt?",
    metaDescription:
      "KJV passages about doubt and honest questions, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Doubt is inside scripture, not outside it. Some of the most direct questions to God are recorded as prayer.",
      "You are not the first person to ask.",
    ],
    passages: [
      {
        ref: "Mark 9:24",
        book: "Mark",
        chapter: 9,
        text: "And straightway the father of the child cried out, and said with tears, Lord, I believe; help thou mine unbelief.",
        note: "Belief and unbelief in one breath, and it was enough.",
      },
      {
        ref: "Psalms 13:1-2",
        book: "Psalms",
        chapter: 13,
        text: "How long wilt thou forget me, O LORD? for ever? how long wilt thou hide thy face from me? How long shall I take counsel in my soul, having sorrow in my heart daily? how long shall mine enemy be exalted over me?",
        note: "Four questions, none of them answered in the verse.",
      },
      {
        ref: "John 20:27",
        book: "John",
        chapter: 20,
        text: "Then saith he to Thomas, Reach hither thy finger, and behold my hands; and reach hither thy hand, and thrust it into my side: and be not faithless, but believing.",
        note: "The evidence Thomas asked for was offered to him.",
      },
      {
        ref: "James 1:5",
        book: "James",
        chapter: 1,
        text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
        note: "Upbraideth not — the asking is not held against you.",
      },
      {
        ref: "Jude 1:22",
        book: "Jude",
        chapter: 1,
        text: "And of some have compassion, making a difference.",
        note: "Doubt is met with compassion here, not argument.",
      },
    ],
    closing:
      "Questions asked honestly are not a retreat from faith. They are usually the shape faith takes under pressure.",
    related: [
      "what-does-the-bible-say-about-feeling-far-from-god",
      "what-does-the-bible-say-about-prayer-when-god-feels-silent",
      "what-does-the-bible-say-about-purpose",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-worry-about-money",
    question: "What does the Bible say about worrying about money?",
    metaDescription:
      "KJV passages about money, provision and worry, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture talks about money often and without embarrassment. It does not promise wealth, and it does not shame need.",
      "Nothing below is financial advice.",
    ],
    passages: [
      {
        ref: "Matthew 6:25-26",
        book: "Matthew",
        chapter: 6,
        text: "Therefore I say unto you, Take no thought for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than meat, and the body than raiment? Behold the fowls of the air: for they sow not, neither do they reap, nor gather into barns; yet your heavenly Father feedeth them. Are ye not much better than they?",
        note: "Spoken to people for whom food was a genuine daily question.",
      },
      {
        ref: "Philippians 4:19",
        book: "Philippians",
        chapter: 4,
        text: "But my God shall supply all your need according to his riches in glory by Christ Jesus.",
        note: "Need, named carefully — the verse does not say every want.",
      },
      {
        ref: "1 Timothy 6:10",
        book: "1 Timothy",
        chapter: 6,
        text: "For the love of money is the root of all evil: which while some coveted after, they have erred from the faith, and pierced themselves through with many sorrows.",
        note: "The love of it, not the having of it.",
      },
      {
        ref: "Proverbs 3:9-10",
        book: "Proverbs",
        chapter: 3,
        text: "Honour the LORD with thy substance, and with the firstfruits of all thine increase: So shall thy barns be filled with plenty, and thy presses shall burst out with new wine.",
        note: "Substance here means what you actually have, however small.",
      },
      {
        ref: "Hebrews 13:5",
        book: "Hebrews",
        chapter: 13,
        text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.",
        note: "Contentment is tied to presence, not to the amount.",
      },
    ],
    closing:
      "This page is not financial advice. If you are behind on bills or in debt, a qualified adviser or a local support service can help with the practical side.",
    related: [
      "what-does-the-bible-say-about-anxiety",
      "what-does-the-bible-say-about-contentment",
      "what-does-the-bible-say-about-trusting-god-in-uncertainty",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-waiting-on-god",
    question: "What does the Bible say about waiting on God?",
    metaDescription:
      "KJV passages about waiting, patience and delay, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Waiting is one of the most common experiences in scripture, and one of the least comfortable.",
      "These passages do not shorten the wait. They describe what happens inside it.",
    ],
    passages: [
      {
        ref: "Isaiah 40:31",
        book: "Isaiah",
        chapter: 40,
        text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
        note: "Renewal is described as happening during the wait.",
      },
      {
        ref: "Psalms 27:14",
        book: "Psalms",
        chapter: 27,
        text: "Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD.",
        note: "The instruction is repeated because once was not enough.",
      },
      {
        ref: "Psalms 40:1",
        book: "Psalms",
        chapter: 40,
        text: "I waited patiently for the LORD; and he inclined unto me, and heard my cry.",
        note: "Written afterwards, by someone who had already waited.",
      },
      {
        ref: "Lamentations 3:25-26",
        book: "Lamentations",
        chapter: 3,
        text: "The LORD is good unto them that wait for him, to the soul that seeketh him. It is good that a man should both hope and quietly wait for the salvation of the LORD.",
        note: "From a book written in ruins.",
      },
      {
        ref: "Habakkuk 2:3",
        book: "Habakkuk",
        chapter: 2,
        text: "For the vision is yet for an appointed time, but at the end it shall speak, and not lie: though it tarry, wait for it; because it will surely come, it will not tarry.",
        note: "Tarrying is anticipated, not treated as failure.",
      },
    ],
    closing:
      "Waiting is not wasted time in scripture, though it rarely feels like anything else while you are in it.",
    related: [
      "what-does-the-bible-say-about-patience",
      "what-does-the-bible-say-about-hope",
      "what-does-the-bible-say-about-purpose",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-anger",
    question: "What does the Bible say about anger?",
    metaDescription:
      "KJV passages about anger and what to do with it, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture does not forbid anger outright. It is careful about what anger is allowed to become.",
      "Read the distinction it draws.",
    ],
    passages: [
      {
        ref: "Ephesians 4:26-27",
        book: "Ephesians",
        chapter: 4,
        text: "Be ye angry, and sin not: let not the sun go down upon your wrath: Neither give place to the devil.",
        note: "Anger is permitted; its lifespan is limited.",
      },
      {
        ref: "James 1:19-20",
        book: "James",
        chapter: 1,
        text: "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath: For the wrath of man worketh not the righteousness of God.",
        note: "Slow, not never.",
      },
      {
        ref: "Proverbs 15:1",
        book: "Proverbs",
        chapter: 15,
        text: "A soft answer turneth away wrath: but grievous words stir up anger.",
        note: "The volume of the answer changes the room.",
      },
      {
        ref: "Proverbs 29:11",
        book: "Proverbs",
        chapter: 29,
        text: "A fool uttereth all his mind: but a wise man keepeth it in till afterwards.",
        note: "Till afterwards — the thought is still spoken, just not yet.",
      },
      {
        ref: "Psalms 4:4",
        book: "Psalms",
        chapter: 4,
        text: "Stand in awe, and sin not: commune with your own heart upon your bed, and be still.",
        note: "A private place is given for what cannot be said out loud.",
      },
    ],
    closing:
      "If your anger is frightening you or the people around you, that is worth taking to someone qualified, not only to scripture.",
    related: [
      "what-does-the-bible-say-about-forgiveness",
      "what-does-the-bible-say-about-bitterness",
      "what-does-the-bible-say-about-patience",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-depression",
    question: "What does the Bible say about depression?",
    metaDescription:
      "KJV passages that speak to deep discouragement, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture records people who wanted to die, who could not get up, and who said so plainly to God.",
      "Nothing here is medical advice, and none of it replaces treatment.",
    ],
    passages: [
      {
        ref: "Psalms 42:11",
        book: "Psalms",
        chapter: 42,
        text: "Why art thou cast down, O my soul? and why art thou disquieted within me? hope thou in God: for I shall yet praise him, who is the health of my countenance, and my God.",
        note: "The writer is speaking to himself, and has to repeat it.",
      },
      {
        ref: "1 Kings 19:5-7",
        book: "1 Kings",
        chapter: 19,
        text: "And as he lay and slept under a juniper tree, behold, then an angel touched him, and said unto him, Arise and eat. And he looked, and, behold, there was a cake baken on the coals, and a cruse of water at his head. And he did eat and drink, and laid him down again. And the angel of the LORD came again the second time, and touched him, and said unto him, Arise and eat; because the journey is too great for thee.",
        note: "Elijah was given food and sleep before he was given anything to do.",
      },
      {
        ref: "Psalms 34:18",
        book: "Psalms",
        chapter: 34,
        text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.",
        note: "Nearness, offered without conditions.",
      },
      {
        ref: "Psalms 40:2",
        book: "Psalms",
        chapter: 40,
        text: "He brought me up also out of an horrible pit, out of the miry clay, and set my feet upon a rock, and established my goings.",
        note: "Brought up out of — the pit was real.",
      },
      {
        ref: "Isaiah 61:3",
        book: "Isaiah",
        chapter: 61,
        text: "To appoint unto them that mourn in Zion, to give unto them beauty for ashes, the oil of joy for mourning, the garment of praise for the spirit of heaviness; that they might be called trees of righteousness, the planting of the LORD, that he might be glorified.",
        note: "The spirit of heaviness is named as a real weight.",
      },
    ],
    closing:
      "This is not medical advice. Depression responds to treatment; if you are struggling, please speak to a doctor. If you are thinking of harming yourself, call or text 988 now.",
    related: [
      "what-does-the-bible-say-about-hope",
      "what-does-the-bible-say-about-grief",
      "what-does-the-bible-say-about-feeling-far-from-god",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-hope",
    question: "What does the Bible say about hope?",
    metaDescription:
      "KJV passages about hope, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Hope in scripture is not optimism. It is expectation placed in someone, usually while things are still hard.",
      "These passages were mostly written before the situation improved.",
    ],
    passages: [
      {
        ref: "Romans 15:13",
        book: "Romans",
        chapter: 15,
        text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.",
        note: "Hope is described as something given, not manufactured.",
      },
      {
        ref: "Lamentations 3:21-23",
        book: "Lamentations",
        chapter: 3,
        text: "This I recall to my mind, therefore have I hope. It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
        note: "Recall to my mind — hope here is an act of deliberate memory.",
      },
      {
        ref: "Psalms 42:5",
        book: "Psalms",
        chapter: 42,
        text: "Why art thou cast down, O my soul? and why art thou disquieted in me? hope thou in God: for I shall yet praise him for the help of his countenance.",
        note: "Yet — a word doing a great deal of work.",
      },
      {
        ref: "Hebrews 6:19",
        book: "Hebrews",
        chapter: 6,
        text: "Which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil.",
        note: "An anchor holds a boat that is still being moved by water.",
      },
      {
        ref: "Romans 5:3-4",
        book: "Romans",
        chapter: 5,
        text: "And not only so, but we glory in tribulations also: knowing that tribulation worketh patience; And patience, experience; and experience, hope.",
        note: "Hope arrives last in that order, not first.",
      },
    ],
    closing:
      "If hope feels out of reach today, the passages above do not require you to feel it before you read them.",
    related: [
      "what-does-the-bible-say-about-depression",
      "what-does-the-bible-say-about-waiting-on-god",
      "what-does-the-bible-say-about-grief",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-guilt-and-shame",
    question: "What does the Bible say about guilt and shame?",
    metaDescription:
      "KJV passages about guilt, shame and being forgiven, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture takes guilt seriously enough to answer it rather than dismiss it.",
      "Shame — the sense of being the problem — is handled differently from guilt over an act.",
    ],
    passages: [
      {
        ref: "Psalms 103:12",
        book: "Psalms",
        chapter: 103,
        text: "As far as the east is from the west, so far hath he removed our transgressions from us.",
        note: "A distance chosen because it cannot be measured.",
      },
      {
        ref: "Romans 8:1",
        book: "Romans",
        chapter: 8,
        text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.",
        note: "Now — the timing matters.",
      },
      {
        ref: "1 John 1:9",
        book: "1 John",
        chapter: 1,
        text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.",
        note: "Faithful and just, rather than reluctant.",
      },
      {
        ref: "Isaiah 1:18",
        book: "Isaiah",
        chapter: 1,
        text: "Come now, and let us reason together, saith the LORD: though your sins be as scarlet, they shall be as white as snow; though they be red like crimson, they shall be as wool.",
        note: "An invitation to talk, not a summons.",
      },
      {
        ref: "Psalms 34:5",
        book: "Psalms",
        chapter: 34,
        text: "They looked unto him, and were lightened: and their faces were not ashamed.",
        note: "Faces — shame is described as something visible being lifted.",
      },
    ],
    closing:
      "Guilt that keeps returning after confession is worth talking through with someone you trust.",
    related: [
      "what-does-the-bible-say-about-forgiveness",
      "what-does-the-bible-say-about-starting-over",
      "what-does-the-bible-say-about-temptation",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-temptation",
    question: "What does the Bible say about temptation?",
    metaDescription:
      "KJV passages about temptation and the way out, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture treats temptation as ordinary rather than as evidence that something has gone uniquely wrong with you.",
      "It also assumes a way through.",
    ],
    passages: [
      {
        ref: "1 Corinthians 10:13",
        book: "1 Corinthians",
        chapter: 10,
        text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.",
        note: "Common to man — the first thing said is that you are not alone in it.",
      },
      {
        ref: "James 1:13-14",
        book: "James",
        chapter: 1,
        text: "Let no man say when he is tempted, I am tempted of God: for God cannot be tempted with evil, neither tempteth he any man: But every man is tempted, when he is drawn away of his own lust, and enticed.",
        note: "The source is named plainly, and it is not God.",
      },
      {
        ref: "Hebrews 4:15",
        book: "Hebrews",
        chapter: 4,
        text: "For we have not an high priest which cannot be touched with the feeling of our infirmities; but was in all points tempted like as we are, yet without sin.",
        note: "Tempted in all points — the sympathy is first-hand.",
      },
      {
        ref: "Matthew 26:41",
        book: "Matthew",
        chapter: 26,
        text: "Watch and pray, that ye enter not into temptation: the spirit indeed is willing, but the flesh is weak.",
        note: "Said without contempt to men who had just fallen asleep.",
      },
      {
        ref: "Psalms 119:11",
        book: "Psalms",
        chapter: 119,
        text: "Thy word have I hid in mine heart, that I might not sin against thee.",
        note: "Hidden beforehand, for use later.",
      },
    ],
    closing:
      "If what you are facing is an addiction, scripture and proper treatment belong together, not in competition.",
    related: [
      "what-does-the-bible-say-about-guilt-and-shame",
      "what-does-the-bible-say-about-starting-over",
      "what-does-the-bible-say-about-patience",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-patience",
    question: "What does the Bible say about patience?",
    metaDescription:
      "KJV passages about patience, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Patience in scripture is usually described as something produced in you rather than something you decide to have.",
      "It is closer to endurance than to calm.",
    ],
    passages: [
      {
        ref: "Galatians 5:22-23",
        book: "Galatians",
        chapter: 5,
        text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.",
        note: "Fruit grows. It is not summoned.",
      },
      {
        ref: "James 5:7",
        book: "James",
        chapter: 5,
        text: "Be patient therefore, brethren, unto the coming of the Lord. Behold, the husbandman waiteth for the precious fruit of the earth, and hath long patience for it, until he receive the early and latter rain.",
        note: "The farmer is the picture: work done, then waiting.",
      },
      {
        ref: "Romans 12:12",
        book: "Romans",
        chapter: 12,
        text: "Rejoicing in hope; patient in tribulation; continuing instant in prayer.",
        note: "Three things held at once, in a hard season.",
      },
      {
        ref: "Ecclesiastes 7:8",
        book: "Ecclesiastes",
        chapter: 7,
        text: "Better is the end of a thing than the beginning thereof: and the patient in spirit is better than the proud in spirit.",
        note: "The end is preferred, but it still has to be reached.",
      },
      {
        ref: "Psalms 37:7",
        book: "Psalms",
        chapter: 37,
        text: "Rest in the LORD, and wait patiently for him: fret not thyself because of him who prospereth in his way, because of the man who bringeth wicked devices to pass.",
        note: "Comparison is named as the thing that undoes patience.",
      },
    ],
    closing:
      "Patience is not the same as having no feelings about the delay.",
    related: [
      "what-does-the-bible-say-about-waiting-on-god",
      "what-does-the-bible-say-about-anger",
      "what-does-the-bible-say-about-hope",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-feeling-far-from-god",
    question: "What does the Bible say about feeling far from God?",
    metaDescription:
      "KJV passages for when God feels distant, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "The sense of distance is described in scripture by people who had not stopped believing.",
      "It is a recorded experience, not a disqualification.",
    ],
    passages: [
      {
        ref: "Psalms 22:1",
        book: "Psalms",
        chapter: 22,
        text: "My God, my God, why hast thou forsaken me? why art thou so far from helping me, and from the words of my roaring?",
        note: "A psalm that begins in abandonment and is still a prayer.",
      },
      {
        ref: "Psalms 139:7-10",
        book: "Psalms",
        chapter: 139,
        text: "Whither shall I go from thy spirit? or whither shall I flee from thy presence? If I ascend up into heaven, thou art there: if I make my bed in hell, behold, thou art there. If I take the wings of the morning, and dwell in the uttermost parts of the sea; Even there shall thy hand lead me, and thy right hand shall hold me.",
        note: "Presence described as inescapable, even when unfelt.",
      },
      {
        ref: "Jeremiah 29:13",
        book: "Jeremiah",
        chapter: 29,
        text: "And ye shall seek me, and find me, when ye shall search for me with all your heart.",
        note: "Seeking is assumed to take effort and time.",
      },
      {
        ref: "James 4:8",
        book: "James",
        chapter: 4,
        text: "Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded.",
        note: "Movement in both directions.",
      },
      {
        ref: "Deuteronomy 4:29",
        book: "Deuteronomy",
        chapter: 4,
        text: "But if from thence thou shalt seek the LORD thy God, thou shalt find him, if thou seek him with all thy heart and with all thy soul.",
        note: "From thence — from wherever you actually are.",
      },
    ],
    closing:
      "Distance felt is not the same as distance proved. These writers kept speaking anyway.",
    related: [
      "what-does-the-bible-say-about-prayer-when-god-feels-silent",
      "what-does-the-bible-say-about-doubt",
      "what-does-the-bible-say-about-loneliness",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-prayer-when-god-feels-silent",
    question: "What does the Bible say about praying when God feels silent?",
    metaDescription:
      "KJV passages about prayer in silence and unanswered prayer, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture contains prayers that went unanswered for a long time, and it keeps them in the record.",
      "Silence is not treated as proof of absence.",
    ],
    passages: [
      {
        ref: "Romans 8:26",
        book: "Romans",
        chapter: 8,
        text: "Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered.",
        note: "Not knowing what to say is anticipated here.",
      },
      {
        ref: "Psalms 28:1",
        book: "Psalms",
        chapter: 28,
        text: "Unto thee will I cry, O LORD my rock; be not silent to me: lest, if thou be silent to me, I become like them that go down into the pit.",
        note: "The silence is addressed directly, as part of the prayer.",
      },
      {
        ref: "Luke 18:1",
        book: "Luke",
        chapter: 18,
        text: "And he spake a parable unto them to this end, that men ought always to pray, and not to faint.",
        note: "Told because fainting was the likely alternative.",
      },
      {
        ref: "Psalms 62:8",
        book: "Psalms",
        chapter: 62,
        text: "Trust in him at all times; ye people, pour out your heart before him: God is a refuge for us. Selah.",
        note: "Pour out — no editing required first.",
      },
      {
        ref: "Matthew 6:6",
        book: "Matthew",
        chapter: 6,
        text: "But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.",
        note: "Private prayer is the assumed default, not the exception.",
      },
    ],
    closing:
      "A prayer that feels like it went nowhere is still recorded in scripture as prayer.",
    related: [
      "what-does-the-bible-say-about-feeling-far-from-god",
      "what-does-the-bible-say-about-doubt",
      "what-does-the-bible-say-about-waiting-on-god",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-starting-over",
    question: "What does the Bible say about starting over?",
    metaDescription:
      "KJV passages about new beginnings after failure, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Scripture is full of second attempts, and the people given them are usually the ones who failed publicly.",
      "Starting again is a normal event in it.",
    ],
    passages: [
      {
        ref: "Isaiah 43:18-19",
        book: "Isaiah",
        chapter: 43,
        text: "Remember ye not the former things, neither consider the things of old. Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert.",
        note: "A way in the wilderness — not a way out of it first.",
      },
      {
        ref: "2 Corinthians 5:17",
        book: "2 Corinthians",
        chapter: 5,
        text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.",
        note: "Stated as an accomplished fact, not a target.",
      },
      {
        ref: "Proverbs 24:16",
        book: "Proverbs",
        chapter: 24,
        text: "For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.",
        note: "Seven falls, and he is still called just.",
      },
      {
        ref: "Philippians 3:13-14",
        book: "Philippians",
        chapter: 3,
        text: "Brethren, I count not myself to have apprehended: but this one thing I do, forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark for the prize of the high calling of God in Christ Jesus.",
        note: "Written by a man with a past he never denied.",
      },
      {
        ref: "Lamentations 3:22-23",
        book: "Lamentations",
        chapter: 3,
        text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
        note: "New every morning — the supply is daily.",
      },
    ],
    closing:
      "Beginning again does not require the last attempt to be explained away.",
    related: [
      "what-does-the-bible-say-about-guilt-and-shame",
      "what-does-the-bible-say-about-purpose",
      "what-does-the-bible-say-about-hope",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-trusting-god-in-uncertainty",
    question: "What does the Bible say about trusting God when everything is uncertain?",
    metaDescription:
      "KJV passages about trust when the outcome is unknown, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Trust in scripture is usually asked for before the outcome is known, not afterwards.",
      "That is what makes it trust.",
    ],
    passages: [
      {
        ref: "Proverbs 3:5-6",
        book: "Proverbs",
        chapter: 3,
        text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
        note: "Understanding is not condemned — only leaning your whole weight on it.",
      },
      {
        ref: "Psalms 56:3-4",
        book: "Psalms",
        chapter: 56,
        text: "What time I am afraid, I will trust in thee. In God I will praise his word, in God I have put my trust; I will not fear what flesh can do unto me.",
        note: "Fear and trust in consecutive lines.",
      },
      {
        ref: "Isaiah 26:3",
        book: "Isaiah",
        chapter: 26,
        text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.",
        note: "Stayed — held in place, deliberately.",
      },
      {
        ref: "Psalms 37:5",
        book: "Psalms",
        chapter: 37,
        text: "Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.",
        note: "Commit is an action taken before anything is visible.",
      },
      {
        ref: "Psalms 31:14-15",
        book: "Psalms",
        chapter: 31,
        text: "But I trusted in thee, O LORD: I said, Thou art my God. My times are in thy hand: deliver me from the hand of mine enemies, and from them that persecute me.",
        note: "My times — including the ones not yet arrived.",
      },
    ],
    closing:
      "Trusting God does not mean you should stop making sensible decisions about the situation in front of you.",
    related: [
      "what-does-the-bible-say-about-anxiety",
      "what-does-the-bible-say-about-fear",
      "what-does-the-bible-say-about-waiting-on-god",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-contentment",
    question: "What does the Bible say about contentment?",
    metaDescription:
      "KJV passages about contentment in plenty and in want, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Contentment is described in scripture as learned, which means it was not there at the start.",
      "It is not the same as having enough.",
    ],
    passages: [
      {
        ref: "Philippians 4:11-12",
        book: "Philippians",
        chapter: 4,
        text: "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content. I know both how to be abased, and I know how to abound: every where and in all things I am instructed both to be full and to be hungry, both to abound and to suffer need.",
        note: "Learned and instructed — over time, and through both states.",
      },
      {
        ref: "1 Timothy 6:6-8",
        book: "1 Timothy",
        chapter: 6,
        text: "But godliness with contentment is great gain. For we brought nothing into this world, and it is certain we can carry nothing out. And having food and raiment let us be therewith content.",
        note: "The floor is set low on purpose.",
      },
      {
        ref: "Hebrews 13:5",
        book: "Hebrews",
        chapter: 13,
        text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.",
        note: "Contentment attached to a person, not an amount.",
      },
      {
        ref: "Psalms 23:1",
        book: "Psalms",
        chapter: 23,
        text: "The LORD is my shepherd; I shall not want.",
        note: "Four words that the rest of the psalm then unpacks.",
      },
      {
        ref: "Proverbs 30:8-9",
        book: "Proverbs",
        chapter: 30,
        text: "Remove far from me vanity and lies: give me neither poverty nor riches; feed me with food convenient for me: Lest I be full, and deny thee, and say, Who is the LORD? or lest I be poor, and steal, and take the name of my God in vain.",
        note: "A prayer for the middle, which is rarely prayed.",
      },
    ],
    closing:
      "Contentment in scripture is not indifference to hardship, and it is not a reason to accept injustice.",
    related: [
      "what-does-the-bible-say-about-worry-about-money",
      "what-does-the-bible-say-about-patience",
      "what-does-the-bible-say-about-hope",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-bitterness",
    question: "What does the Bible say about bitterness?",
    metaDescription:
      "KJV passages about bitterness and resentment, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Bitterness is described in scripture as something that grows and spreads, which is why it is treated early.",
      "It is not the same as being right about a wrong done to you.",
    ],
    passages: [
      {
        ref: "Hebrews 12:15",
        book: "Hebrews",
        chapter: 12,
        text: "Looking diligently lest any man fail of the grace of God; lest any root of bitterness springing up trouble you, and thereby many be defiled.",
        note: "A root — underground before it is visible.",
      },
      {
        ref: "Ephesians 4:31-32",
        book: "Ephesians",
        chapter: 4,
        text: "Let all bitterness, and wrath, and anger, and clamour, and evil speaking, be put away from you, with all malice: And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
        note: "Something is put away and something else is put in its place.",
      },
      {
        ref: "Romans 12:19",
        book: "Romans",
        chapter: 12,
        text: "Dearly beloved, avenge not yourselves, but rather give place unto wrath: for it is written, Vengeance is mine; I will repay, saith the Lord.",
        note: "The wrong is not dismissed; it is handed over.",
      },
      {
        ref: "Job 7:11",
        book: "Job",
        chapter: 7,
        text: "Therefore I will not refrain my mouth; I will speak in the anguish of my spirit; I will complain in the bitterness of my soul.",
        note: "Job says it out loud to God, and the book keeps the words.",
      },
      {
        ref: "Psalms 73:21-22",
        book: "Psalms",
        chapter: 73,
        text: "Thus my heart was grieved, and I was pricked in my reins. So foolish was I, and ignorant: I was as a beast before thee.",
        note: "An honest account of what resentment had done to him.",
      },
    ],
    closing:
      "Naming bitterness is not the same as excusing the person who caused it.",
    related: [
      "what-does-the-bible-say-about-forgiveness",
      "what-does-the-bible-say-about-anger",
      "what-does-the-bible-say-about-guilt-and-shame",
    ],
  },
  {
    slug: "what-does-the-bible-say-about-courage",
    question: "What does the Bible say about courage?",
    metaDescription:
      "KJV passages about courage and strength, quoted in full. Public-domain King James Version (1769).",
    intro: [
      "Courage is commanded in scripture far more often than it is admired, and always to people who were afraid.",
      "The reason given is almost never the strength of the person.",
    ],
    passages: [
      {
        ref: "Joshua 1:9",
        book: "Joshua",
        chapter: 1,
        text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
        note: "Whithersoever — no place excluded.",
      },
      {
        ref: "1 Chronicles 28:20",
        book: "1 Chronicles",
        chapter: 28,
        text: "And David said to Solomon his son, Be strong and of good courage, and do it: fear not, nor be dismayed: for the LORD God, even my God, will be with thee; he will not fail thee, nor forsake thee, until thou hast finished all the work for the service of the house of the LORD.",
        note: "And do it — courage attached to a task.",
      },
      {
        ref: "Psalms 31:24",
        book: "Psalms",
        chapter: 31,
        text: "Be of good courage, and he shall strengthen your heart, all ye that hope in the LORD.",
        note: "Strength follows the step rather than preceding it.",
      },
      {
        ref: "1 Corinthians 16:13",
        book: "1 Corinthians",
        chapter: 16,
        text: "Watch ye, stand fast in the faith, quit you like men, be strong.",
        note: "Four short instructions, given to ordinary people.",
      },
      {
        ref: "Psalms 27:14",
        book: "Psalms",
        chapter: 27,
        text: "Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD.",
        note: "Courage here looks like staying, not charging.",
      },
    ],
    closing:
      "Courage in scripture is usually the next step taken while still afraid.",
    related: [
      "what-does-the-bible-say-about-fear",
      "what-does-the-bible-say-about-trusting-god-in-uncertainty",
      "what-does-the-bible-say-about-starting-over",
    ],
  },
];

export function getQuestionPage(slug: string): QuestionPage | undefined {
  return questionPages.find((q) => q.slug === slug);
}
