import {
  Noto_Sans,
  Noto_Serif,
  Noto_Serif_JP,
  Noto_Sans_Myanmar,
  Noto_Sans_Sinhala,
  Noto_Sans_Khmer,
} from "next/font/google";

// Latin + Vietnamese diacritics come first in the stack; Japanese glyphs fall through to the JP faces.
export const notoSans = Noto_Sans({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-noto-sans", display: "swap" });
// Variable fonts (no fixed weights): one file per character range carries every weight,
// instead of one file per weight per range — far fewer downloads for the same look.
export const notoSerif = Noto_Serif({ subsets: ["latin", "latin-ext", "vietnamese"], variable: "--font-noto-serif", display: "swap" });
export const notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-noto-serif-jp", display: "swap", preload: false });

// Script fonts: unicode-range means the browser only downloads them when those glyphs appear.
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: ["400", "600"], variable: "--font-myanmar", display: "swap", preload: false });
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "600"], variable: "--font-sinhala", display: "swap", preload: false });
const khmer = Noto_Sans_Khmer({ subsets: ["khmer"], weight: ["400", "600"], variable: "--font-khmer", display: "swap", preload: false });

export const scriptFonts = [myanmar.variable, sinhala.variable, khmer.variable];
