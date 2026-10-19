import { IBM_Plex_Sans } from 'next/font/google';

// Long-form prose needs a true italic (emphasis, quantity symbols written as
// text) that the root layout's Plex Sans doesn't load. Loaded here so only
// guide pages carry it, and only the italic face — upright text keeps using
// the root's --font-sans files. Browsers fetch it only when italic text is
// actually on the page.
const italic = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  variable: '--font-italic',
  display: 'swap',
});

export default function GuideLayout({ children }) {
  return <div className={italic.variable}>{children}</div>;
}
