# Icon Setup

## Current Status
- `icon.svg` - SVG version of the extension icon
- You need to convert this to `icon.png` (128x128px) for the extension

## To Create icon.png:

### Option 1: Using Online Converter
1. Go to https://convertio.co/svg-png/
2. Upload `icon.svg`
3. Set size to 128x128
4. Download as `icon.png`

### Option 2: Using ImageMagick (if installed)
```bash
convert icon.svg -resize 128x128 icon.png
```

### Option 3: Use Your TazaPay Logo
Replace `icon.svg` with your actual TazaPay logo and convert to PNG.

## Requirements
- Size: 128x128 pixels
- Format: PNG
- Background: Can be transparent or solid color
- Should be recognizable at small sizes