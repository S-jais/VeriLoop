# VeriLoop Asset & Dependency Licenses

All typography, iconography, and visual shaders in the VeriLoop frontend are permissively licensed open-source assets or custom-authored procedural code. No proprietary or unlicensed external media is used.

---

## 1. Typography

### Inter
- **Source**: [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- **Author**: Rasmus Andersson
- **License**: [SIL Open Font License 1.1 (OFL-1.1)](https://openfontlicense.org/)
- **Usage**: Primary sans-serif UI typography for headings, body copy, and UI controls.

### JetBrains Mono
- **Source**: [Google Fonts - JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- **Author**: JetBrains
- **License**: [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- **Usage**: Monospaced font for test probe codes, JSON payloads, evaluation metrics, and stage identifiers.

---

## 2. Iconography

### Lucide React
- **Source**: [Lucide Icons](https://lucide.dev/)
- **Package**: `lucide-react`
- **License**: [ISC License](https://opensource.org/licenses/ISC)
- **Usage**: Crisp SVG system icons for navigation, evaluation indicators, search, and action buttons.

---

## 3. Visual Shaders & Canvas Artwork

### Procedural WebGL Plasma Vortex
- **Source**: Authored in-tree (`src/components/VeriLoopCore.tsx`, `src/components/AmbientEnergyBackdrop.tsx`)
- **License**: MIT License (included with VeriLoop project repository)
- **Details**: 100% mathematical fragment shaders using fractional Brownian motion (fBm) and noise algorithms rendered directly on HTML5 WebGL canvas. Zero external video files, PNG textures, or raster images required.
- **Accessibility**: Honors OS `prefers-reduced-motion: reduce` preference with manual user Pause / Resume control.
