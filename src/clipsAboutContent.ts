// Content for the "About" panel on the Clips tab.
// Edit these fields to update the mission statement that visitors see when
// they land on the Clips tab (especially via a shared clip permalink).

export interface AboutContent {
  /** Short tagline shown alongside the section title. */
  tagline: string;
  /** Longer paragraphs explaining what Clips is and why it exists. */
  paragraphs: string[];
  /** Optional footer link list: { label, href }. */
  links?: { label: string; href: string }[];
}

export const CLIPS_ABOUT: AboutContent = {
  tagline:
    'A notebook for the data finds worth keeping.',
  paragraphs: [
    "I love stumbling on a perfect data chart on Twitter and thinking 'I should remember this.' Clips is the running notebook for that — every interesting find lands here, remixed to match this dashboard's look, and gets its own shareable permalink with a proper Open Graph card.",
    'Each clip is a one-page story: a title, a chart, the source, and what makes it worth keeping. Browse by tag (#monetary-policy, #markets, #fiscal…) or by month archive. Subscribe in any RSS reader via the Atom feed below.',
  ],
  links: [
    { label: 'Atom feed', href: 'clips.xml' },
    { label: 'Sitemap', href: 'sitemap.xml' },
  ],
};
