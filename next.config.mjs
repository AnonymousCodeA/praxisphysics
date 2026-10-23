/** @type {import('next').NextConfig} */
const nextConfig = {
  // Guide section 5 was "Data analysis" at /guide/analysis before it became
  // "Worked examples"; keep old links and bookmarks working.
  async redirects() {
    return [{ source: '/guide/analysis', destination: '/guide/worked-examples', permanent: true }];
  },
};
export default nextConfig;
