import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hello RSVP",
    short_name: "Hello RSVP",
    description: "Free invitations and RSVP tracking for any event.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3f6f4",
    theme_color: "#0f6e6a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
