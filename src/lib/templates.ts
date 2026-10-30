import type { TemplateId } from "./types";

export interface InviteTemplate {
  id: TemplateId;
  name: string;
  description: string;
  /** Colors for the small swatch in the template picker: background, ink, accent. */
  swatch: [string, string, string];
  /** Page background behind the card on the guest's invite page. */
  pageBackground: string;
}

export const TEMPLATES: InviteTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Engraved-card feel with a framed border",
    swatch: ["#ffffff", "#12302f", "#0f6e6a"],
    pageBackground: "#e8efed",
  },
  {
    id: "marigold",
    name: "Marigold",
    description: "Warm and festive with a flower garland",
    swatch: ["#fff6d8", "#5e1a24", "#f4b400"],
    pageBackground: "#f8e7b0",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep navy with gold lettering",
    swatch: ["#16213f", "#f3e6c4", "#d4af5a"],
    pageBackground: "#0d1530",
  },
  {
    id: "confetti",
    name: "Confetti",
    description: "Bright, bold and playful",
    swatch: ["#ffffff", "#1d1a3a", "#ff5c8a"],
    pageBackground: "#ffe3ec",
  },
  {
    id: "garden",
    name: "Garden",
    description: "Soft sage with botanical calm",
    swatch: ["#e6eee2", "#23412f", "#7a9a6c"],
    pageBackground: "#d3e0cc",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean type, no decoration",
    swatch: ["#ffffff", "#141414", "#141414"],
    pageBackground: "#eeeeec",
  },
];

export function getTemplate(id: string | null | undefined): InviteTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
