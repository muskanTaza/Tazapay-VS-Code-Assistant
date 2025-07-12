# TazaPay Extension Icon Setup

## Required: Convert icon.svg to icon.png

Your `package.json` now references `icon.png` but you need to create this file.

### Method 1: Online Converter
1. Go to https://convertio.co/svg-png/
2. Upload your `icon.svg` file
3. Set size to **128x128 pixels**
4. Download as `icon.png`
5. Place in root directory

### Method 2: Command Line (if you have ImageMagick)
```bash
convert icon.svg -resize 128x128 icon.png
```

### Method 3: Design Software
- Open `icon.svg` in Figma, Adobe Illustrator, or Inkscape
- Export as PNG at 128x128 pixels
- Save as `icon.png` in root directory

## Current Status
✅ `package.json` updated with `"icon": "icon.png"`
✅ `activity-icon.svg` optimized for VS Code
❌ `icon.png` file missing - **YOU NEED TO CREATE THIS**

## After Creating icon.png
1. Rebuild: `npm run compile && vsce package`
2. Reinstall: `code --uninstall-extension tazapay.tazapay-mcp && code --install-extension tazapay-mcp-1.2.0.vsix`
3. Your TazaPay icon will appear in VS Code!

## File Requirements
- **Format**: PNG
- **Size**: 128x128 pixels
- **Location**: `/icon.png` (root directory)
- **Purpose**: Extension marketplace, installation page, extension list