export type StorySourceId =
  | 'espn'
  | 'espn-rss'
  | 'marca'
  | 'mediotiempo'
  | 'tudn'
  | 'acceso';

export type Story = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceId: StorySourceId;
  sourceLabel: string;
  publishedAt: string | null;
  image?: string;
  /** Short Acceso angle — never replaces the original article */
  accesoLine?: string;
};

export type StoriesPayload = {
  generatedAt: string;
  stories: Story[];
};
