
import { slugify } from "../utils.mjs"
import {
  isCanonicalCustomProperty,
  isCompleteGradientValue,
  isExportableTokenValue,
} from "../validation/token-syntax.mjs"

function isCssValue(value        )          {
  return isExportableTokenValue(value)
}

function canExportToken(token        ) {
  return !token.trim() || isCanonicalCustomProperty(token)
}

function variableName(token        , prefix        , fallback        )         {
  const normalized = token.trim()
  return isCanonicalCustomProperty(normalized)
    ? normalized
    : `--${prefix}-${slugify(fallback)}`
}

/**
 * Exports design tokens as CSS custom properties in :root { } format.
 */
export function exportToCss(tokens              )         {
  const lines           = [
    `/* ${tokens.meta.name} 的设计 token */`,
    `/* 由 Design MD Editor 生成 */`,
    "",
    ":root {",
  ]

  // Colors
  lines.push("  /* 颜色 */")
  for (const c of tokens.colors) {
    if (isCssValue(c.value) && canExportToken(c.token)) {
      lines.push(`  ${variableName(c.token, "color", c.name)}: ${c.value};`)
    }
  }
  lines.push("")

  // Gradients
  if (tokens.gradients.length > 0) {
    lines.push("  /* 渐变 */")
    for (const g of tokens.gradients) {
      if (
        isCssValue(g.value) &&
        isCompleteGradientValue(g.value) &&
        canExportToken(g.token)
      ) {
        lines.push(
          `  ${variableName(g.token, "gradient", g.name)}: ${g.value};`
        )
      }
    }
    lines.push("")
  }

  // Typography: font families
  if (tokens.typography.fontFamilies.length > 0) {
    lines.push("  /* 排版 - 字体家族 */")
    for (const f of tokens.typography.fontFamilies) {
      const value = f.substitute || f.name
      if (isCssValue(value) && canExportToken(f.token)) {
        lines.push(`  ${variableName(f.token, "font", f.name)}: ${value};`)
      }
    }
    lines.push("")
  }

  // Typography: type scale
  if (tokens.typography.typeScale.length > 0) {
    lines.push("  /* 排版 - 字阶 */")
    for (const t of tokens.typography.typeScale) {
      if (!canExportToken(t.token)) continue
      const slug = slugify(t.role)
      if (isCssValue(t.size)) lines.push(`  --type-${slug}-size: ${t.size};`)
      if (isCssValue(t.lineHeight))
        lines.push(`  --type-${slug}-line-height: ${t.lineHeight};`)
      if (isCssValue(t.letterSpacing))
        lines.push(`  --type-${slug}-letter-spacing: ${t.letterSpacing};`)
    }
    lines.push("")
  }

  // Spacing
  if (tokens.spacing.length > 0) {
    lines.push("  /* 间距 */")
    for (const s of tokens.spacing) {
      if (isCssValue(s.value) && canExportToken(s.token)) {
        lines.push(`  ${variableName(s.token, "space", s.name)}: ${s.value};`)
      }
    }
    lines.push("")
  }

  // Radius
  if (tokens.radius.length > 0) {
    lines.push("  /* 圆角 */")
    for (const r of tokens.radius) {
      if (isCssValue(r.value) && canExportToken(r.token)) {
        lines.push(`  ${variableName(r.token, "radius", r.name)}: ${r.value};`)
      }
    }
    lines.push("")
  }

  // Shadows
  if (tokens.shadows.length > 0) {
    lines.push("  /* 阴影 */")
    for (const s of tokens.shadows) {
      if (isCssValue(s.value) && canExportToken(s.token)) {
        lines.push(`  ${variableName(s.token, "shadow", s.name)}: ${s.value};`)
      }
    }
    lines.push("")
  }

  // Layout
  lines.push("  /* 布局 */")
  if (isCssValue(tokens.layout.sectionGap))
    lines.push(`  --layout-section-gap: ${tokens.layout.sectionGap};`)
  if (isCssValue(tokens.layout.cardPadding))
    lines.push(`  --layout-card-padding: ${tokens.layout.cardPadding};`)
  if (isCssValue(tokens.layout.elementGap))
    lines.push(`  --layout-element-gap: ${tokens.layout.elementGap};`)
  if (isCssValue(tokens.layout.maxContentWidth))
    lines.push(`  --layout-max-width: ${tokens.layout.maxContentWidth};`)

  lines.push("}")
  lines.push("")

  return lines.join("\n")
}

/**
 * Exports design tokens as a Tailwind CSS @theme block.
 */
export function exportToTailwindTheme(tokens              )         {
  const lines           = [
    `/* ${tokens.meta.name} 的 Tailwind CSS @theme */`,
    `/* 由 Design MD Editor 生成 */`,
    "",
    "@theme {",
  ]

  for (const c of tokens.colors) {
    if (isCssValue(c.value) && canExportToken(c.token)) {
      lines.push(`  ${variableName(c.token, "color", c.name)}: ${c.value};`)
    }
  }

  for (const f of tokens.typography.fontFamilies) {
    const value = f.substitute || f.name
    if (isCssValue(value) && canExportToken(f.token)) {
      lines.push(`  ${variableName(f.token, "font", f.name)}: ${value};`)
    }
  }

  for (const type of tokens.typography.typeScale) {
    if (!canExportToken(type.token)) continue
    const token = type.token.trim().startsWith("--text-")
      ? type.token.trim()
      : `--text-${slugify(type.role)}`
    const suffix = token.replace(/^--text-/, "")
    if (isCssValue(type.size)) lines.push(`  ${token}: ${type.size};`)
    if (isCssValue(type.lineHeight)) {
      lines.push(`  --leading-${suffix}: ${type.lineHeight};`)
    }
    if (isCssValue(type.letterSpacing)) {
      lines.push(`  --tracking-${suffix}: ${type.letterSpacing};`)
    }
  }

  for (const s of tokens.spacing) {
    if (isCssValue(s.value) && canExportToken(s.token)) {
      const token = s.token.startsWith("--space-")
        ? s.token.replace(/^--space-/, "--spacing-")
        : `--spacing-${slugify(s.name)}`
      lines.push(`  ${token}: ${s.value};`)
    }
  }

  for (const r of tokens.radius) {
    if (isCssValue(r.value) && canExportToken(r.token)) {
      lines.push(`  ${variableName(r.token, "radius", r.name)}: ${r.value};`)
    }
  }

  for (const s of tokens.shadows) {
    if (isCssValue(s.value) && canExportToken(s.token)) {
      lines.push(`  ${variableName(s.token, "shadow", s.name)}: ${s.value};`)
    }
  }

  lines.push("}")
  lines.push("")

  return lines.join("\n")
}
