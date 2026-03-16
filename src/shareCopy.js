import { SITE_NAME } from './siteConfig';

function cleanLabel(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

const HOME_SHARE_VARIANTS = [
  {
    title: 'omg... these cat toys on miaow.lol just ate my afternoon',
    text: '15 chaotic little browser toys for cats, children, and adults who were supposed to be doing something else.',
  },
  {
    title: 'BREAKING: miaow.lol has ruined my productivity',
    text: 'I opened one cat toy "for a second" and now I live here.',
  },
  {
    title: 'i regret clicking miaow.lol because now i need to send it to everyone',
    text: 'It is impossible to see these ridiculous cat toys and keep them to yourself.',
  },
  {
    title: 'official statement: miaow.lol is dangerously silly',
    text: 'Tiny browser toys. Huge "wait, why is this so good?" energy.',
  },
  {
    title: 'help... i found the internet toy aisle and it is miaow.lol',
    text: 'A suspiciously good collection of cat-themed browser nonsense.',
  },
  {
    title: 'normal website? no. miaow.lol? unfortunately yes',
    text: 'Fifteen weird little toys that feel like a dare and a delight.',
  },
  {
    title: 'this is the part where i tell you miaow.lol is stupidly fun',
    text: 'I expected one joke. I did not expect to keep clicking.',
  },
  {
    title: 'urgent: somebody take miaow.lol away from me',
    text: 'Cat toys, toddler bait, and a very real threat to your to-do list.',
  },
  {
    title: 'me: one minute on miaow.lol. also me: where did the day go',
    text: 'The rare website that feels like a toy box with Wi-Fi.',
  },
  {
    title: 'breaking news from my browser: miaow.lol absolutely slaps',
    text: 'It is playful, unserious, and somehow impossible to close.',
  },
  {
    title: 'i clicked miaow.lol as a joke and now the joke is on me',
    text: 'A tiny collection of cat chaos with disturbingly high replay value.',
  },
  {
    title: 'public service announcement: miaow.lol is pure cat-brained chaos',
    text: 'If your standards include "makes me laugh immediately," this clears the bar.',
  },
  {
    title: 'hate when a goofy website is actually this good? try miaow.lol',
    text: 'Fifteen little browser toys with terminally shareable energy.',
  },
  {
    title: 'i should not be this obsessed with miaow.lol but here we are',
    text: 'This site has big "one more click" energy and zero respect for your schedule.',
  },
  {
    title: 'miaow.lol feels like a toddler arcade designed by internet gremlins',
    text: 'Ridiculous, charming, and much harder to quit than it should be.',
  },
];

const EXPERIENCE_SHARE_VARIANTS = [
  (title) => ({
    title: `BREAKING: I literally cannot stop using ${title} on ${SITE_NAME}`,
    text: `${title} is a chaotic little cat toy that starts as "just one click" and ends with you sending the link to everyone you know.`,
  }),
  (title) => ({
    title: `omg... look at this ${title} thing on ${SITE_NAME}`,
    text: `I opened ${title} for a joke and now I have been pressing it for an unreasonable amount of time.`,
  }),
  (title) => ({
    title: `bad news: ${title} on ${SITE_NAME} has my full attention`,
    text: `This tiny toy has absolutely no business being this weirdly satisfying.`,
  }),
  (title) => ({
    title: `i regret showing people ${title} on ${SITE_NAME} because now they are obsessed`,
    text: `${title} has strong "just try it once" energy and then suddenly you are stuck there.`,
  }),
  (title) => ({
    title: `official statement: ${title} on ${SITE_NAME} is stupidly fun`,
    text: `This is the kind of browser toy that makes you laugh and then immediately click again.`,
  }),
  (title) => ({
    title: `urgent: someone take ${title} away from me on ${SITE_NAME}`,
    text: `I meant to test ${title}. I did not mean to become emotionally attached to it.`,
  }),
  (title) => ({
    title: `this ${title} toy on ${SITE_NAME} is pure internet nonsense`,
    text: `And I mean that as the highest possible compliment.`,
  }),
  (title) => ({
    title: `me trying ${title} on ${SITE_NAME}: one sec. me ten minutes later: ...`,
    text: `${title} has a truly reckless amount of replay value for something so gloriously dumb.`,
  }),
  (title) => ({
    title: `cannot believe ${title} on ${SITE_NAME} got me this good`,
    text: `It is silly, tactile, immediate, and somehow impossible to close once you start.`,
  }),
  (title) => ({
    title: `if you only click one ridiculous thing today, make it ${title} on ${SITE_NAME}`,
    text: `This toy is aggressively shareable in the best way.`,
  }),
  (title) => ({
    title: `${title} on ${SITE_NAME} feels like a toy someone smuggled into my browser`,
    text: `You click once, you laugh once, and then you keep going for way too long.`,
  }),
  (title) => ({
    title: `i clicked ${title} on ${SITE_NAME} ironically and now i am stuck here`,
    text: `Somewhere between joke website and genuine compulsion lives this little menace.`,
  }),
  (title) => ({
    title: `${title} on ${SITE_NAME} is giving unreasonably strong "one more turn" energy`,
    text: `I cannot defend how much time I just spent with this, but I can recommend it.`,
  }),
  (title) => ({
    title: `public service announcement: ${title} on ${SITE_NAME} absolutely rules`,
    text: `It is tiny, chaotic, and suspiciously good at hijacking your attention.`,
  }),
  (title) => ({
    title: `terrible update: ${title} on ${SITE_NAME} is now my whole personality`,
    text: `This little browser toy is so unserious and so locked in at the same time.`,
  }),
];

function pickVariantIndex(length, random = Math.random) {
  const safeLength = Math.max(1, Number(length) || 0);
  const value = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
  return Math.floor(value * safeLength);
}

export function buildDefaultShareCopy(experience) {
  return buildShareCopy(experience, () => 0);
}

export function buildShareCopy(experience, random = Math.random) {
  if (!experience) {
    return HOME_SHARE_VARIANTS[pickVariantIndex(HOME_SHARE_VARIANTS.length, random)];
  }

  const title = cleanLabel(experience.title) || SITE_NAME;
  return EXPERIENCE_SHARE_VARIANTS[pickVariantIndex(EXPERIENCE_SHARE_VARIANTS.length, random)](title);
}
