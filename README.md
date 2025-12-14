# Localize Type

A web app for stress-testing font stacks across languages. This tool can help provide granular typography control when localized text gets rendered into their respective fonts.

How to use: Upload a primary 'brand' font along with your fallback fonts then preview real text and see exactly how your font stack supports global locales.

This tool is especially helpful when your primary 'brand' font is highly stylized causing fallback fonts to not match (in scale and alignment) with the primary font.

## Features

- **Upload a font stack**
  - Drop multiple font files at once: first file becomes the Primary font, remaining files become Fallback fonts
  - Add additional fallback fonts later
- **Cascade fallback preview (per character)**
  - Missing glyphs in the primary font are rendered using the first fallback that supports that glyph
  - Each fallback font can be visually distinguished via per-font color
- **Multi-language grid (15 locales/scripts)**
  - Latin: English, Lithuanian, Vietnamese
  - Greek, Cyrillic (Russian)
  - RTL: Arabic, Persian
  - Indic scripts: Bengali, Hindi (Devanagari), Kannada, Telugu
  - Southeast Asia: Thai
  - CJK: Chinese (Simplified), Japanese, Korean
- **Show/hide languages**
  - Use the **Languages** button (top-right) to toggle which language cards are displayed
  - Includes Select all / Select none / Reset
  - Your selection persists in the browser (via `localStorage`)
- **Typography controls**
  - Global font weight (propagates to all fonts in the stack)
  - Global fallback size adjust
  - Global line height and letter spacing
  - Text casing (normal/lowercase/uppercase/capitalize)
  - Header presets and a dedicated Header Style editor (H1-H6 scale/line-height/letter-spacing)
- **Overrides (global, per-font, per-language)**
  - Per-fallback-font overrides: weight, size adjust, and line height
  - Weight overrides: fallback fonts inherit global weight but can override individually
  - Per-language fallback selection (choose a specific fallback font or use the cascade)
  - Per-language custom text editing
  - Override manager to review and reset active overrides
- **Export CSS**
  - Generate CSS for your current typography settings (including `@font-face` for uploaded fonts)
  - Copy to clipboard or download a `.css` file
- **Font color palette**
  - Assign a color to each font in the stack for better visualization
- **Accurate UI controls**
  - Precise sliders and input fields for fine-tuning typography settings

## Getting Started

### Prerequisites

- Node.js 18+
- npm

## Development

This project uses Vite + React + TailwindCSS.

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to view the app.

## How to Use

1. **Upload fonts**
   - Drag and drop one or more font files (`.ttf`, `.otf`, `.woff`, `.woff2`).
   - The first file becomes the Primary font. The rest become Fallback fonts.
2. **Tune global typography** (left sidebar)
   - Adjust global font weight (applies to all fonts)
   - Adjust global fallback size
   - Adjust line height and letter spacing
   - Switch between H1–H6 (or “All”) to preview different header presets
3. **Show/hide languages**
   - Click **Languages** in the top-right to choose which locales are visible
   - The app remembers your selection across refreshes
4. **Manage the font stack**
   - Reorder fonts via drag & drop to change cascade priority
   - Configure per-fallback overrides (weight, size, and line height)
   - Fallback fonts inherit the global weight but can override individually
   - Set per-font colors to quickly see which font is used for each glyph
5. **Per-language overrides** (on each language card)
   - Pick a specific fallback font for a locale (or keep “Default” to use the cascade)
   - Edit the sample text and save a custom override
6. **Export CSS**
   - Click **Export CSS** to copy/download CSS representing your current settings

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to DigitalOcean.

1. Push your code to GitHub
2. Update `.do/app.yaml` with your repository details
3. Create a new app in DigitalOcean App Platform
4. Connect your repository and deploy!

## Tech Stack

- **Frontend:** React 19
- **Build Tool:** Vite 7
- **Styling:** TailwindCSS 4
- **Font Parsing:** OpenType.js
- **Deployment:** DigitalOcean App Platform

## License

MIT

