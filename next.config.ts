import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://accesofutbol.com https://www.accesofutbol.com https://*.godaddy.com https://*.godaddysites.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
