export type EpisodeSource = "markdown";

export type ListenLinkKey =
  | "spotify"
  | "apple"
  | "google"
  | "youtube"
  | "amazon"
  | "rss";

export interface EpisodeLinks {
  spotify?: string;
  apple?: string;
  google?: string;
  youtube?: string;
  amazon?: string;
  rss?: string;
}

export interface Episode {
  id: string;
  number: number;
  slug: string;
  title: string;
  guest: string;
  company?: string;
  summary: string;
  body?: string;
  image: string;
  releasedAt: string;
  tags: string[];
  links: EpisodeLinks;
  previewAudio?: string;
  source: EpisodeSource;
  createdAt: string;
  updatedAt: string;
}

export interface EpisodeStoreFile {
  importedAt: string;
  episodes: Episode[];
}
