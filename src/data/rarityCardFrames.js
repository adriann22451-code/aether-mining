import FRAME_COMMON from "../assets/images/frames-full/frame-common-portrait.webp";
import FRAME_UNCOMMON from "../assets/images/frames-full/frame-uncommon-portrait.webp";
import FRAME_RARE from "../assets/images/frames-full/frame-rare-portrait.webp";
import FRAME_EPIC from "../assets/images/frames-full/frame-epic-portrait.webp";
import FRAME_LEGENDARY from "../assets/images/frames-full/frame-legendary-portrait.webp";

// Generated sci-fi hardware frames (portrait, ~460x608 source) used as the
// border-image wrapping an entire item card, one per rarity tier.
export const RARITY_CARD_FRAMES = {
  Common: FRAME_COMMON,
  Uncommon: FRAME_UNCOMMON,
  Rare: FRAME_RARE,
  Epic: FRAME_EPIC,
  Legendary: FRAME_LEGENDARY,
};

// Matches the actual pixel border thickness measured on the 460x608 source
// (top right bottom left), for use as the CSS border-image-slice value.
export const RARITY_CARD_FRAME_SLICE = "47 45 42 44";
