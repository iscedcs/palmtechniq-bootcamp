/**
 * Track images mapping & helpers.
 *
 * Local images placed in `/public/assets/tracks/{slug}.jpg` or `.png` will be
 * served automatically, with high-quality fallback imagery provided for each track.
 */

export const TRACK_IMAGES: Record<
  string,
  {
    image: string;
    thumbnail: string;
    alt: string;
  }
> = {
  coding: {
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=80",
    alt: "Coding and Software Development Workspace",
  },
  "artificial-intelligence": {
    image:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=200&q=80",
    alt: "Artificial Intelligence and Machine Learning Models",
  },
  "content-creation": {
    image:
      "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=1200&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=200&q=80",
    alt: "Content Creation, Videography and Media Studio",
  },
  "graphic-design": {
    image:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=200&q=80",
    alt: "Graphic Design, Typography and Visual Layouts",
  },
  "basic-it": {
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=200&q=80",
    alt: "Information Technology and Computing Fundamentals",
  },
};

const DEFAULT_TRACK_MEDIA = {
  image:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  thumbnail:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=200&q=80",
  alt: "PalmTechnIQ Bootcamp Track",
};

export function getTrackMedia(slug: string) {
  return TRACK_IMAGES[slug] ?? DEFAULT_TRACK_MEDIA;
}
