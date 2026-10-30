import type { EventType, GiftKind } from "./types";

export interface GiftSuggestion {
  title: string;
  kind: GiftKind;
}

const GIFT_CARDS: GiftSuggestion[] = [
  { title: "Amazon gift card", kind: "gift_card" },
  { title: "Favorite restaurant gift card", kind: "gift_card" },
  { title: "Bookstore gift card", kind: "gift_card" },
];

const BY_TYPE: Record<EventType, GiftSuggestion[]> = {
  birthday: [
    { title: "Book from my wish list", kind: "item" },
    { title: "Wireless earbuds", kind: "item" },
    { title: "Scented candle set", kind: "item" },
    { title: "Board game for game nights", kind: "item" },
    { title: "Experience: cooking class or concert tickets", kind: "idea" },
  ],
  wedding: [
    { title: "Stand mixer", kind: "item" },
    { title: "Dinnerware set", kind: "item" },
    { title: "Bedding set", kind: "item" },
    { title: "Cookware set", kind: "item" },
    { title: "Contribution to our honeymoon", kind: "idea" },
  ],
  baby_shower: [
    { title: "Diapers (size 1 or 2)", kind: "item" },
    { title: "Baby monitor", kind: "item" },
    { title: "Swaddle blankets", kind: "item" },
    { title: "Stroller", kind: "item" },
    { title: "Board books for baby's first library", kind: "item" },
  ],
  housewarming: [
    { title: "Indoor plant", kind: "item" },
    { title: "Kitchen knife set", kind: "item" },
    { title: "Throw blanket", kind: "item" },
    { title: "Coffee maker", kind: "item" },
    { title: "Toolkit", kind: "item" },
  ],
  dinner: [
    { title: "Bring a dessert", kind: "idea" },
    { title: "Bring a side dish", kind: "idea" },
    { title: "Bring drinks", kind: "idea" },
    { title: "Bring ice and cups", kind: "idea" },
  ],
  party: [
    { title: "Bring snacks", kind: "idea" },
    { title: "Bring drinks", kind: "idea" },
    { title: "Party games", kind: "item" },
    { title: "Bluetooth speaker", kind: "item" },
  ],
  festival: [
    { title: "Sweets box", kind: "item" },
    { title: "Dry fruit hamper", kind: "item" },
    { title: "Decorative lights", kind: "item" },
    { title: "Bring a dish to share", kind: "idea" },
  ],
  graduation: [
    { title: "Laptop bag", kind: "item" },
    { title: "Professional notebook and pen set", kind: "item" },
    { title: "Contribution to first-apartment fund", kind: "idea" },
    { title: "Luggage for the next adventure", kind: "item" },
  ],
  work: [
    { title: "Bring a dish for the potluck", kind: "idea" },
    { title: "Group gift contribution", kind: "idea" },
    { title: "Card everyone signs", kind: "idea" },
  ],
  other: [
    { title: "Bring a dish to share", kind: "idea" },
    { title: "Book from my wish list", kind: "item" },
    { title: "Indoor plant", kind: "item" },
  ],
};

export function giftSuggestions(type: EventType): GiftSuggestion[] {
  return [...(BY_TYPE[type] ?? BY_TYPE.other), ...GIFT_CARDS];
}

export const STORES = [
  { id: "amazon.com", label: "Amazon (US)" },
  { id: "amazon.in", label: "Amazon (India)" },
  { id: "amazon.co.uk", label: "Amazon (UK)" },
  { id: "amazon.ca", label: "Amazon (Canada)" },
  { id: "amazon.com.au", label: "Amazon (Australia)" },
  { id: "amazon.de", label: "Amazon (Germany)" },
  { id: "amazon.ae", label: "Amazon (UAE)" },
  { id: "none", label: "No store link" },
] as const;

export type StoreId = (typeof STORES)[number]["id"];

/** Best guess at the host's Amazon store from their browser language, e.g. "en-IN" -> amazon.in */
export function guessStore(locale: string | undefined): StoreId {
  const region = (locale ?? "").split("-")[1]?.toUpperCase();
  switch (region) {
    case "IN":
      return "amazon.in";
    case "GB":
      return "amazon.co.uk";
    case "CA":
      return "amazon.ca";
    case "AU":
      return "amazon.com.au";
    case "DE":
    case "AT":
      return "amazon.de";
    case "AE":
      return "amazon.ae";
    default:
      return "amazon.com";
  }
}

/** Store search link for a gift idea, so the host has somewhere to start. */
export function storeSearchUrl(store: StoreId, query: string): string | null {
  if (store === "none") return null;
  return `https://www.${store}/s?k=${encodeURIComponent(query)}`;
}

export const GIFT_KIND_LABEL: Record<GiftKind, string> = {
  item: "Gift",
  gift_card: "Gift card",
  idea: "Bring along",
};
