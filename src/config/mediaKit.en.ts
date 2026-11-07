import { mediaKit } from './mediaKit';

// Same October snapshot and deliverable counts; only the buyer-facing copy changes.
export const mediaKitEn = {
  ...mediaKit,
  meta: { title: 'Acceso Futbol · Sponsorships', updated: 'October 2026' },
  clips: [
    { src: '/luis.jpg', alt: 'Acceso Futbol editorial screenshot: Liga MX in Austin, Texas' },
    { src: '/jonathang.jpg', alt: 'Acceso Futbol editorial screenshot: the road to the 2026 World Cup' },
  ],
  pillars: [
    { title: 'Be part of every matchday', copy: 'Associate your brand with Juegos de Hoy, Top 5 news or predictions. Recurring formats can support a campaign across several weeks.' },
    { title: 'Content with its own voice', copy: 'We bring your message into stories made for fans: context, opinion and a reason to participate.' },
    { title: 'A measurable next step', copy: 'Direct fans to a promotion, registration or campaign page with trackable links and reporting agreed in the brief.' },
  ],
  notes: {
    geography: 'Do not add these up. Instagram: 95.1% in Mexico or the U.S. (2,144 of 2,254 located). YouTube: 93.30% (115,796 + 46,752 of 174,225). Facebook has no country split. No verified age, city or conversions.',
    terms: 'Production, dates and travel require agreement. Usage rights, paid media and exclusivity are quoted separately. Each proposal defines deliverables, revisions, cancellation and replacement terms.',
  },
  platforms: mediaKit.platforms.map((p, i) => ({
    ...p,
    period: ['October 1–31', 'October 1–31', 'October 1–31', 'October 1–31'][i],
    metric: ['video views', 'video views', 'account views, including stories', 'channel views'][i],
    followerLabel: i === 3 ? 'subscribers as of 7 Nov 2026' : i === 2 ? 'followers as of 7 Nov 2026' : 'followers',
    growth: ['+2,622 net', '+856 net', '+178 new (8–31 Oct)', '+157 net in the period'][i],
    medianLabel: ['impressions per post', 'views per video', 'views per post', 'views per October video'][i],
    detail: ['6,656,616 page impressions. Videos and graphics for the matchday conversation.', 'Spanish-language opinion, news and previews. 37.0% of the audience in the United States.', 'Reels, stories and graphics. 43.3% of located followers are in the United States.', 'Distribution mainly through Shorts. 64,503 minutes watched (1,075 hours) in the reported window.'][i],
  })),
  geography: [
    { platform: 'TikTok', population: 'Audience · October 1–31', mexico: '30.4%', us: '37.0%' },
    { platform: 'Instagram', population: 'Located followers · October snapshot', mexico: '51.8%', us: '43.3%' },
    { platform: 'YouTube', population: 'Views · October 1–31', mexico: '66.5%', us: '26.8%' },
  ],
  packages: [
    { id: 'piloto', name: 'Pilot campaign', duration: 'One campaign', benefit: 'Test how your brand fits into our coverage.', deliverables: ['2 original vertical videos with brand integration', 'Each video distributed on all 4 platforms: 8 video placements', '2 Instagram stories with a campaign link', 'One report by asset and platform'], bestFor: 'Launches, promotions and first collaborations.' },
    { id: 'mensual', name: 'Monthly presenter', duration: '4 weeks', benefit: 'Bring your brand into a format fans recognize.', deliverables: ['8 original franchise videos: Juegos de Hoy, Top 5 or predictions', 'Each video distributed on all 4 platforms: 32 video placements', '4 matchday graphics and 4 stories with a link', 'Final report and review for the next campaign'], bestFor: 'Brands seeking recurring visibility in Mexican football.' },
    { id: 'evento', name: 'Event coverage', duration: 'One activation', benefit: 'Bring your event into the fan conversation.', deliverables: ['2 original videos: 1 preview and 1 vertical recap', 'Each video distributed on all 4 platforms: 8 video placements', '4 Instagram coverage stories', 'Registration or promotion link and final report'], bestFor: 'Events, watch parties, stores and fan experiences.' },
  ],
  proof: mediaKit.proof.map((p, i) => ({ ...p,
    title: ['Matchday graphic', 'América vs Tijuana preview', 'A player’s story'][i],
    metric: ['impressions on one post', 'views on one video', 'views on one reel'][i],
    detail: ['October 25 example, Jornada 14 recap. Fixtures and schedules give a brand a place in useful content.', 'Published October 28. A preview offers room for a contextual integration.', 'Published September 6. Player stories open a conversation.'][i],
  })),
  faqs: [
    { question: 'What does a campaign cost?', answer: 'We quote based on production, asset count, duration, usage rights and exclusivity. Share your goal to receive a specific scope and investment.' },
    { question: 'What reporting will I receive?', answer: 'A report by asset and platform with available views or impressions and interactions. Campaign links include measured clicks. Purchases or registrations require agreed access to destination measurement with your team.' },
    { question: 'Are views guaranteed?', answer: 'Kit figures are historical editorial results. Each campaign defines deliverables, measurement and terms in writing. Organic performance depends on the topic, timing and platform.' },
    { question: 'Can I use the videos in ads?', answer: 'Licensing, ad usage and category exclusivity can be quoted separately. We define duration, territory and channels before production.' },
    { question: 'How is content approved?', answer: 'We agree the brief, message, calendar and review rounds before publishing. We label sponsored content and preserve editorial independence.' },
  ],
};
