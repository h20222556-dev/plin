# PLIN Design System & Iconography Rules

## 🎨 Color Palette
- **Background**: `#FFFFFF` (Strictly white)
- **Primary**: `#0054CB` (Blue)
- **Secondary/Surface**: `#F2F4F7` (Light Gray)
- **Border**: `#EAECF0`
- **Text Primary**: `#101828`
- **Text Secondary**: `#475467`
- **Text Muted**: `#667085`

## 🖋️ Typography
- **Primary Font**: `Pretendard Variable`
- **Rule**: Do NOT use any other fonts (San-serif, system fonts, etc.).
- **Line Height**: 1.5

## 📐 Layout & Spacing (HIG Compliant)
- **Mobile Margins**: `20px`
- **Component Padding**: `16px`, `24px`, `32px`
- **Safe Area**: Ample top/bottom padding for mobile navigation.

## 🖼️ Iconography (Lucide React)
**All interface icons must be from `lucide-react`.**

### Icon Sizes
- `16px` / `20px` / `24px` / `32px` / `48px`
- *No arbitrary sizes allowed.*

### Icon Colors
Use only the following defined text tokens:
- `text-primary` (`#0054CB`)
- `text-text-pri` (`#101828`)
- `text-text-sec` (`#475467`)
- `text-text-meta` (`#667085`)
- `text-white` (`#FFFFFF`)

### Rules
- Do not mix icon libraries in a single page.
- Do not use Emojis as icons.

## 🎨 Illustrations (unDraw)
- **Allowed**: `unDraw` (https://undraw.co/illustrations)
- **Color**: Main color must be `#0054CB` (Primary Blue) or Black/White.
- **Format**: SVG only.
- **Storage**: `client/public/images/illustrations/`
- **Usage**: Only for EmptyStates, Auth pages, Onboarding, and Error pages.
- **Rule**: Do not mix illustrations and photos on the same screen.
