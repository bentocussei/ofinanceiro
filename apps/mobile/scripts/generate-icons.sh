#!/bin/bash
# Generate app icons from SVG logo
# Requires: rsvg-convert (librsvg) or Inkscape
# Install on macOS: brew install librsvg

set -e

LOGO_SVG="../../apps/web/public/logo/logo_icon.svg"
OUT_DIR="../assets/images"

# Create a modified SVG with white background for icon (1024x1024)
cat > /tmp/of_icon.svg << 'SVGEOF'
<svg width="1024" height="1024" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="0" fill="#ffffff"/>
  <rect x="0" y="0" width="120" height="120" rx="24" fill="#0F766E" opacity="0.08"/>
  <circle cx="60" cy="60" r="34" fill="none" stroke="#0D9488" stroke-width="2.2" opacity="0.35"/>
  <circle cx="60" cy="60" r="24" fill="none" stroke="#0D9488" stroke-width="1.8"/>
  <path d="M44 68 L56 56 L68 63 L82 34" fill="none" stroke="#0D9488" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="82" cy="34" r="3" fill="#0D9488"/>
</svg>
SVGEOF

# Create foreground-only SVG (transparent background) for Android adaptive
cat > /tmp/of_foreground.svg << 'SVGEOF'
<svg width="512" height="512" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="34" fill="none" stroke="#0D9488" stroke-width="2.2" opacity="0.35"/>
  <circle cx="60" cy="60" r="24" fill="none" stroke="#0D9488" stroke-width="1.8"/>
  <path d="M44 68 L56 56 L68 63 L82 34" fill="none" stroke="#0D9488" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="82" cy="34" r="3" fill="#0D9488"/>
</svg>
SVGEOF

# Create background SVG for Android adaptive
cat > /tmp/of_background.svg << 'SVGEOF'
<svg width="512" height="512" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" fill="#f0fdfa"/>
</svg>
SVGEOF

# Monochrome (white on transparent)
cat > /tmp/of_mono.svg << 'SVGEOF'
<svg width="432" height="432" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="24" fill="none" stroke="#fff" stroke-width="1.8"/>
  <path d="M44 68 L56 56 L68 63 L82 34" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="82" cy="34" r="3" fill="#fff"/>
</svg>
SVGEOF

# Splash icon
cat > /tmp/of_splash.svg << 'SVGEOF'
<svg width="1024" height="1024" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="34" fill="none" stroke="#0D9488" stroke-width="2.2" opacity="0.35"/>
  <circle cx="60" cy="60" r="24" fill="none" stroke="#0D9488" stroke-width="1.8"/>
  <path d="M44 68 L56 56 L68 63 L82 34" fill="none" stroke="#0D9488" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="82" cy="34" r="3" fill="#0D9488"/>
</svg>
SVGEOF

echo "SVG files created in /tmp/"
echo "To convert to PNG, run:"
echo "  rsvg-convert -w 1024 -h 1024 /tmp/of_icon.svg > $OUT_DIR/icon.png"
echo "  rsvg-convert -w 512 -h 512 /tmp/of_foreground.svg > $OUT_DIR/android-icon-foreground.png"
echo "  rsvg-convert -w 512 -h 512 /tmp/of_background.svg > $OUT_DIR/android-icon-background.png"
echo "  rsvg-convert -w 432 -h 432 /tmp/of_mono.svg > $OUT_DIR/android-icon-monochrome.png"
echo "  rsvg-convert -w 1024 -h 1024 /tmp/of_splash.svg > $OUT_DIR/splash-icon.png"
echo "  rsvg-convert -w 48 -h 48 /tmp/of_icon.svg > $OUT_DIR/favicon.png"
echo "  cp $OUT_DIR/android-icon-monochrome.png $OUT_DIR/notification-icon.png"
