# Accessibility Guidelines

## Color Contrast Ratios (WCAG AA Compliance)

### ✅ Safe Text Combinations

| Foreground | Background | Ratio | Usage |
|------------|------------|-------|-------|
| `ink` | `paper` | 11.13:1 | Primary text (body, headings) |
| `ink` | `canvas` | 10.77:1 | Text on canvas backgrounds |
| `ink` | `subtle` | 10.14:1 | Text on card surfaces |
| `stone` | `paper` | 4.56:1 | Secondary text, captions ⚠️ barely passes |
| `paper` | `ink` | 11.13:1 | Inverse text (dark backgrounds) |

### ⚠️ Restricted Combinations (Large Text Only: 18pt+ or 14pt+ bold)

| Foreground | Background | Ratio | Usage |
|------------|------------|-------|-------|
| `stone` | `subtle` | 4.16:1 | Use only for large UI labels |
| `ink` | `accent` | 4.48:1 | Use only for buttons/large elements |
| `danger` | `paper` | 3.75:1 | Error messages (large only) |

### ❌ Decorative Only (Never for text)

| Foreground | Background | Ratio | Usage |
|------------|------------|-------|-------|
| `accent` | `paper` | 2.48:1 | Decorative icons, borders only |
| `paper` | `accent` | 2.48:1 | Never use |
| `success` | `paper` | 2.36:1 | Decorative icons only |

## Best Practices

1. **Always use `ink` for body text** on light backgrounds
2. **Use `stone` only for secondary text** like timestamps, captions (minimum 12pt)
3. **Accent colors are for UI elements**, not readable text
4. **Enable high-contrast mode** via `useTheme()` for users who need it
5. **Test with real devices** - OLED screens can show different contrast

## Touch Targets

All interactive elements must be **minimum 44x44pt** per Apple HIG:
- Buttons
- Tab bar items
- List row actions
- Icon buttons

## Dynamic Type

Support iOS Dynamic Type by using relative font sizing:
- Define base sizes in `typography.ts`
- Use `<Typography>` component (auto-scales)
- Avoid hardcoded `fontSize` in styles
