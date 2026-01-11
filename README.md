# Fallback Style

**A powerful web-based tool for stress-testing and fine-tuning font stacks across global languages.**

Fallback Style helps designers and developers gain granular control over typography when "brand fonts" need to share the stage with system or fallback fonts for localized content.

## Why Fallback Style?

Typography is often designed with a single primary language in mind. However, when your application scales to support global languages (Greek, Cyrillic, Thai, Arabic, CJK, etc.), your carefully chosen "Brand Font" may drop characters it doesn't support.

This forces the browser to rely on **Fallback Fonts**, which often leads to:
- **Visual Inconsistency:** Fallback fonts may look heavier, lighter, larger, or smaller than your primary font.
- **Layout Shifts:** A paragraph in Thai might take up 20% more vertical space than English due to different line-height metrics.
- **"Tofu" & Missing Glyphs:** Without a proper strategy, users see empty boxes (□) instead of text.
- **Baseline Alignment Issues:** Mixing fonts often breaks the visual rhythm of your text.

**Fallback Style** solves this by letting you:
1.  **Visualize** exactly where your primary font fails and fallback fonts take over.
2.  **Tune** the fallback fonts (scale, weight, line-height) to match your primary font perfectly.
3.  **Export** production-ready CSS to ensure your live site looks exactly like your design.

---

## Key Features

### 1. Header & Type Scale Manager
- **Visual Typography System:** Define and preview your entire type scale (H1-H6 + Body) in one view.
- **Detached Styles:** Unlink specific headers (e.g., H1) from the global system to give them unique fonts, weights, or line-heights while keeping other elements consistent.
- **Live Preview:** See changes instantly across all enabled languages.

### 2. Smart Font Stacking & Mapping
- **Drag & Drop:** Upload your primary font (`.ttf`, `.otf`, `.woff`, `.woff2`) and any number of custom fallback fonts.
- **Strict Language Mapping:** Explicitly assign specific fonts to specific languages (e.g., "Use *Noto Sans JP* for Japanese, *Inter* for everything else").
- **Priority Management:** Drag to reorder fonts in the stack to control the fallback cascade priority.
- **System Fonts:** Automatically handles standard system fallbacks (sans-serif, serif, monospace) if custom fonts aren't provided.

### 3. Metric Overrides & CSS Properties
- **`size-adjust` logic:** Visually scale fallback fonts to match the x-height of your primary font without changing the CSS `font-size`.
- **`ascent-override`, `descent-override`, `line-gap-override`:** Fine-tune the vertical metrics of any font to prevent layout shifts and clipping, especially in languages with tall glyphs (Thai, Arabic).
- **Letter Spacing & Line Height:** Override these per-font or per-language to ensure perfect rhythm.

### 4. Advanced Visualization Tools
- **Type Grid Overlay:** A generated grid based on your primary font's metrics (Baseline, x-Height, Cap-Height) to visually verify alignment across different scripts.
- **Color Guide:** Toggle color highlighting to instantly see which font is rendering which part of the text (Primary vs Fallback vs System).
- **Linebox View:** Visualize the browser's calculated line-box to debug vertical rhythm issues.

### 5. Font Comparison Mode
- **Side-by-Side:** Compare up to 3 different fonts directly against each other.
- **Overlay View:** Overlay multiple fonts on top of each other to spot subtle differences in weight, width, and metrics.

### 6. Interactive Type Playground
- **Edit Text:** Click any language card to edit the text and paste real production content.
- **Case Switching:** Instantly toggle between Sentence Case, Title Case, UPPERCASE, and lowercase to stress-test your type.
- **Search & Filter:** Quickly find languages by name, region, or script.

### 7. Production Workflow
- **Export to CSS:** Generate clean, production-ready CSS code including `@font-face` definitions with all your metric overrides (`size-adjust`, etc.) baked in.
- **Save Configuration:** Export your entire workspace state to a JSON file (versioned and backward-compatible) to share with teammates or resume work later.

---

## How to Use

### Step 1: Upload Your Fonts
Drag your primary "Brand Font" into the sidebar. Then, add any custom fallback fonts you want to test (e.g., Noto Sans for coverage).

### Step 2: Select Languages
Use the **Languages** menu to toggle the visibility of relevant locales for your project.

### Step 3: Tune Global Styles
Set your baseline values in the sidebar:
- **Base Size:** Default is 16px (1rem), but you can adjust this to see how it scales.
- **Weight & Line Height:** Set these to your brand guidelines.

### Step 4: Normalize Fallback Fonts
If a fallback font looks visually smaller or lighter than your primary font:
1.  Click on the fallback font in the sidebar.
2.  Adjust **Scale %** until the x-height matches your primary font.
3.  Override **Weight** if the fallback looks too bold or thin.

### Step 5: Handle Language Specifics
If a specific language (like Arabic or Thai) still looks wrong:
1.  Go to that language's card in the main view.
2.  Use the **Override** dropdown to force a specific font for just this language.
3.  Click **Edit** to paste real production content to verify fixes.

### Step 6: Export
Click **Export CSS** in the sidebar to get the code.

---

## Development

This project is built with:
- **React 19**
- **Vite 7**
- **TailwindCSS 4**
- **OpenType.js** (for deep font parsing and metrics)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

## License
MIT
