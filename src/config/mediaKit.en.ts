import { mediaKit } from './mediaKit';

// Same September snapshot and deliverable counts; only the buyer-facing copy changes.
export const mediaKitEn = {
  ...mediaKit,
  meta: { title: 'Acceso Futbol · Sponsorships', updated: 'September 2026' },
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
    followers: 'Summed followers and subscribers are not unique people. Platforms use different reporting windows and view definitions. Views are not unique reach.',
    medians: 'September publication medians: Facebook 101 mixed posts (impressions); TikTok 56 uploads, including September 30; Instagram 98 posts; YouTube 59 posts. TikTok and Instagram use accumulated post views at the export date; YouTube uses September 1–28 views. TikTok’s post cohort differs from its September 1–29 account window. These are not sponsored-content forecasts.',
    geography: 'Different denominators; do not add these percentages. Instagram: 1,953 of 2,051 located followers are in Mexico/U.S. (95.22%); total followers: 2,055. YouTube: 188,172 Mexico + 71,233 U.S. views out of 282,917 (91.69%). Facebook has no country breakdown in this snapshot. No verified age, city or conversion data is available.',
    proof: 'Selected editorial examples at the September export date. Historical results demonstrate formats, not sponsor sales or registrations. See the medians for typical post performance. Older screenshots above illustrate editorial style and are separate from the September examples.',
    terms: 'Production, dates and travel require agreement. Usage rights, paid media and exclusivity are quoted separately. Each proposal defines deliverables, revisions, cancellation and replacement terms.',
  },
  platforms: mediaKit.platforms.map((p, i) => ({
    ...p,
    period: ['September 1–30', 'September 1–29', 'September 1–30', 'September 1–28'][i],
    metric: ['video views', 'video views', 'account views, including stories', 'channel views'][i],
    followerLabel: i === 3 ? 'subscribers' : 'followers',
    growth: ['+1,432 net', '+150 net', '+207 new (gross)', '+295 net in the period'][i],
    medianLabel: ['impressions per post', 'views per video', 'views per post', 'views per September video'][i],
    detail: ['2,219,466 page impressions. Videos and graphics for the matchday conversation.', 'Spanish-language opinion, news and previews. 36.8% of views came from the United States.', 'Reels, stories and graphics. 45.7% of located followers are in the United States.', 'Distribution mainly through Shorts. 118,440 minutes watched (1,974 hours) in the reported window.'][i],
  })),
  geography: [
    { platform: 'TikTok', population: 'Views · September 1–29', mexico: '31.4%', us: '36.8%' },
    { platform: 'Instagram', population: 'Located followers · September snapshot', mexico: '49.5%', us: '45.7%' },
    { platform: 'YouTube', population: 'Views · September 1–28', mexico: '66.5%', us: '25.2%' },
  ],
  packages: [
    { id: 'piloto', name: 'Pilot campaign', duration: 'One campaign', benefit: 'Test how your brand fits into our coverage.', deliverables: ['2 original vertical videos with brand integration', 'Each video distributed on all 4 platforms: 8 video placements', '2 Instagram stories with a campaign link', 'One report by asset and platform'], bestFor: 'Launches, promotions and first collaborations.' },
    { id: 'mensual', name: 'Monthly presenter', duration: '4 weeks', benefit: 'Bring your brand into a format fans recognize.', deliverables: ['8 original franchise videos: Juegos de Hoy, Top 5 or predictions', 'Each video distributed on all 4 platforms: 32 video placements', '4 matchday graphics and 4 stories with a link', 'Final report and review for the next campaign'], bestFor: 'Brands seeking recurring visibility in Mexican football.' },
    { id: 'evento', name: 'Event coverage', duration: 'One activation', benefit: 'Bring your event into the fan conversation.', deliverables: ['2 original videos: 1 preview and 1 vertical recap', 'Each video distributed on all 4 platforms: 8 video placements', '4 Instagram coverage stories', 'Registration or promotion link and final report'], bestFor: 'Events, watch parties, stores and fan experiences.' },
  ],
  proof: mediaKit.proof.map((p, i) => ({ ...p,
    title: ['Matchday graphic', 'Title preview', 'A player’s story'][i],
    metric: ['impressions on one post', 'views on one video', 'views on one reel'][i],
    detail: ['September 6 example. Fixtures and schedules give a brand a place in useful content.', 'Published September 16. A preview offers room for a contextual integration.', 'Published September 6. Player stories open a conversation.'][i],
  })),
  faqs: [
    { question: 'What does a campaign cost?', answer: 'We quote based on production, asset count, duration, usage rights and exclusivity. Share your goal to receive a specific scope and investment.' },
    { question: 'What reporting will I receive?', answer: 'A report by asset and platform with available views or impressions and interactions. Campaign links include measured clicks. Purchases or registrations require agreed access to destination measurement with your team.' },
    { question: 'Are views guaranteed?', answer: 'Kit figures are historical editorial results. Each campaign defines deliverables, measurement and terms in writing. Organic performance depends on the topic, timing and platform.' },
    { question: 'Can I use the videos in ads?', answer: 'Licensing, ad usage and category exclusivity can be quoted separately. We define duration, territory and channels before production.' },
    { question: 'How is content approved?', answer: 'We agree the brief, message, calendar and review rounds before publishing. We label sponsored content and preserve editorial independence.' },
  ],
};
