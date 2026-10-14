














































const DEFAULT_COLORS = {
  primary: "#2563eb",
  secondary: "#7c3aed",
  surface: "#ffffff",
  background: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#dc2626",
}

const DEFAULT_TYPE_STYLES = {
  display: {
    role: "display",
    size: "48px",
    lineHeight: "1.1",
    letterSpacing: "-0.03em",
    token: "",
  },
  heading: {
    role: "heading",
    size: "28px",
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
    token: "",
  },
  body: {
    role: "body",
    size: "16px",
    lineHeight: "1.6",
    letterSpacing: "0",
    token: "",
  },
  label: {
    role: "label",
    size: "14px",
    lineHeight: "1.4",
    letterSpacing: "0",
    token: "",
  },
  caption: {
    role: "caption",
    size: "12px",
    lineHeight: "1.4",
    letterSpacing: "0.01em",
    token: "",
  },
}

function keywordScore(
  candidate                                                                  ,
  keywords
) {
  let score = 0

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase()
    if (candidate.role.includes(normalized)) score += 6
    if (candidate.label.includes(normalized)) score += 4
    if (candidate.token.includes(normalized)) score += 3
    if (candidate.haystack.includes(normalized)) score += 1
  }

  return score
}

function normalizeColor(value        ) {
  return value.trim().toLowerCase()
}

function parseCssNumber(value        ) {
  const match = value.match(/-?[\d.]+/)
  return match ? Number.parseFloat(match[0]) : null
}

function parseLength(value        ) {
  const match = value.trim().match(/^(-?[\d.]+)\s*(px|rem|em)?$/i)
  if (!match) return null

  const amount = Number.parseFloat(match[1])
  const unit = (match[2] || "px").toLowerCase()

  if (unit === "rem" || unit === "em") {
    return amount * 16
  }

  return amount
}

function parseRgbFunction(value        ) {
  const match = value
    .trim()
    .match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i
    )

  if (!match) return null

  return {
    r: clampChannel(Number.parseFloat(match[1])),
    g: clampChannel(Number.parseFloat(match[2])),
    b: clampChannel(Number.parseFloat(match[3])),
  }
}

function clampChannel(value        ) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseHexColor(value        ) {
  const hex = value.trim().replace(/^#/, "")

  if (![3, 4, 6, 8].includes(hex.length)) return null

  const expanded =
    hex.length === 3 || hex.length === 4
      ? hex
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : hex

  const rgb = expanded.slice(0, 6)
  const r = Number.parseInt(rgb.slice(0, 2), 16)
  const g = Number.parseInt(rgb.slice(2, 4), 16)
  const b = Number.parseInt(rgb.slice(4, 6), 16)

  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null

  return { r, g, b }
}

function parseColor(value        )                     {
  const rgb = value.trim().startsWith("#")
    ? parseHexColor(value)
    : parseRgbFunction(value)

  if (!rgb) return null

  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let hue = 0

  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  const lightness = (max + min) / 2
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  const luminance = [r, g, b]
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce((total, channel, index) => {
      const weights = [0.2126, 0.7152, 0.0722]
      return total + channel * weights[index]
    }, 0)

  return {
    r: rgb.r,
    g: rgb.g,
    b: rgb.b,
    luminance,
    hue,
    saturation,
    lightness,
  }
}

function toRgba(color        , alpha        ) {
  const parsed = parseColor(color)
  if (!parsed) return color
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`
}

function readableForeground(
  background        ,
  light = "#ffffff",
  dark = "#0f172a"
) {
  const parsed = parseColor(background)
  if (!parsed) return dark
  return parsed.luminance > 0.45 ? dark : light
}

function buildColorCandidates(tokens              )                   {
  return tokens.colors.map((color) => ({
    item: color,
    label: color.name.toLowerCase(),
    role: color.role.toLowerCase(),
    token: color.token.toLowerCase(),
    haystack: `${color.name} ${color.role} ${color.token}`.toLowerCase(),
    parsed: parseColor(color.value),
  }))
}

function buildNumericCandidates

 (items     , parser                                  )                        {
  return items.map((item) => ({
    item,
    label: (item.name || "").toLowerCase(),
    role: (item.role || "").toLowerCase(),
    token: (item.token || "").toLowerCase(),
    haystack:
      `${item.name || ""} ${item.role || ""} ${item.token || ""}`.toLowerCase(),
    value: parser(item.value),
    rawValue: item.value,
  }))
}

function buildTypeCandidates(typeScale                  ) {
  return typeScale.map((style) => ({
    item: style,
    label: style.role.toLowerCase(),
    role: style.role.toLowerCase(),
    token: style.token.toLowerCase(),
    haystack: `${style.role} ${style.token}`.toLowerCase(),
    value: parseLength(style.size) ?? parseCssNumber(style.size),
    rawValue: style.size,
  }))
}

function resolveFromCandidate   (
  candidate                                  ,
  value   ,
  resolution
)                          {
  return {
    value,
    resolution,
    token: candidate.token || undefined,
    label: candidate.label || undefined,
  }
}

function buildDiagnostic(
  slot        ,
  severity                               ,
  message
)                    {
  return { slot, severity, message }
}

function pickBestKeywordMatch

 (candidates     , keywords          , predicate                            ) {
  let best                                         = null

  for (const candidate of candidates) {
    if (predicate && !predicate(candidate)) continue
    const score = keywordScore(candidate, keywords)
    if (score <= 0) continue

    if (!best || score > best.score) {
      best = { candidate, score }
    }
  }

  return best?.candidate ?? null
}

function pickByMetric

 (
  candidates     ,
  metric                                 ,
  direction               ,
  predicate
) {
  let best                                          = null

  for (const candidate of candidates) {
    if (predicate && !predicate(candidate)) continue
    const metricValue = metric(candidate)
    if (metricValue === null) continue

    if (
      !best ||
      (direction === "min"
        ? metricValue < best.metric
        : metricValue > best.metric)
    ) {
      best = { candidate, metric: metricValue }
    }
  }

  return best?.candidate ?? null
}

function pickClosestNumeric                                     (
  candidates     ,
  target        ,
  predicate
) {
  let best                                            = null

  for (const candidate of candidates) {
    if (predicate && !predicate(candidate)) continue
    if (candidate.value === null) continue
    const distance = Math.abs(candidate.value - target)
    if (!best || distance < best.distance) {
      best = { candidate, distance }
    }
  }

  return best?.candidate ?? null
}

function isNeutral(parsed                    ) {
  return !!parsed && parsed.saturation < 0.18
}

function hueInRange(hue        , start        , end        ) {
  if (start <= end) return hue >= start && hue <= end
  return hue >= start || hue <= end
}

function resolveColorSlot(
  slot                                  ,
  candidates                  ,
  diagnostics                     ,
  options





)                               {
  const explicit = pickBestKeywordMatch(candidates, options.keywords)
  if (explicit) {
    return resolveFromCandidate(explicit, explicit.item.value, "explicit")
  }

  const inferred = options.infer()
  if (inferred) {
    diagnostics.push(buildDiagnostic(slot, "info", options.message))
    return resolveFromCandidate(inferred, inferred.item.value, "inferred")
  }

  diagnostics.push(
    buildDiagnostic(
      slot,
      "warning",
      `缺少 ${slot} 语义映射；预览已回退到 ${options.fallback()}。`
    )
  )

  return {
    value: options.fallback(),
    resolution: "fallback",
  }
}

function toPreviewTypeStyle(style                )                   {
  return {
    role: style.role,
    size: style.size,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    token: style.token,
  }
}

function resolveTypeSlot(
  slot                                                                        ,
  candidates                                        ,
  diagnostics                     ,
  options




)                                         {
  const explicit = pickBestKeywordMatch(candidates, options.keywords)
  if (explicit) {
    return resolveFromCandidate(
      explicit,
      toPreviewTypeStyle(explicit.item),
      "explicit"
    )
  }

  const inferred = options.infer()
  if (inferred) {
    diagnostics.push(
      buildDiagnostic(slot, "info", `预览已根据现有字阶推断 ${slot} 类型角色。`)
    )
    return resolveFromCandidate(
      inferred,
      toPreviewTypeStyle(inferred.item),
      "inferred"
    )
  }

  diagnostics.push(
    buildDiagnostic(
      slot,
      "warning",
      `缺少 ${slot} 类型角色；预览已使用内置备用值。`
    )
  )

  return { value: options.fallback, resolution: "fallback" }
}

function resolveFontSlot(
  slot                            ,
  fonts                                            ,
  diagnostics                     ,
  keywords          ,
  infer                                                                 ,
  fallback
)                               {
  const candidates = fonts.map((font) => ({
    font,
    label: font.name.toLowerCase(),
    role: font.role.toLowerCase(),
    token: font.token.toLowerCase(),
    haystack: `${font.name} ${font.role} ${font.token}`.toLowerCase(),
  }))

  const explicit = pickBestKeywordMatch(candidates, keywords)
  if (explicit) {
    return resolveFromCandidate(
      explicit,
      explicit.font.substitute || explicit.font.name,
      "explicit"
    )
  }

  const inferredFont = infer()
  if (inferredFont) {
    diagnostics.push(
      buildDiagnostic(slot, "info", `预览已根据现有字体栈推断 ${slot}。`)
    )
    return {
      value: inferredFont.substitute || inferredFont.name,
      resolution: "inferred",
      token: inferredFont.token || undefined,
      label: inferredFont.name || undefined,
    }
  }

  diagnostics.push(
    buildDiagnostic(
      slot,
      "warning",
      `缺少 ${slot}；预览已使用备用字体 "${fallback}"。`
    )
  )

  return { value: fallback, resolution: "fallback"          }
}

function resolveNumericSlot

 (
  slot        ,
  candidates                       ,
  diagnostics                     ,
  options




)                               {
  const explicit = pickBestKeywordMatch(candidates, options.keywords)
  if (explicit) {
    return resolveFromCandidate(explicit, explicit.rawValue, "explicit")
  }

  const inferred = options.infer()
  if (inferred) {
    diagnostics.push(
      buildDiagnostic(slot, "info", `预览已根据相近 token 数值推断 ${slot}。`)
    )
    return resolveFromCandidate(inferred, inferred.rawValue, "inferred")
  }

  diagnostics.push(
    buildDiagnostic(
      slot,
      "warning",
      `缺少 ${slot}；预览已使用备用值 ${options.fallback}。`
    )
  )

  return { value: options.fallback, resolution: "fallback"          }
}

function resolveShadowSlot(
  slot        ,
  candidates               ,
  diagnostics                     ,
  keywords          ,
  infer                          ,
  fallback
)                               {
  const mapped = candidates.map((shadow) => ({
    shadow,
    label: shadow.name.toLowerCase(),
    role: "",
    token: shadow.token.toLowerCase(),
    haystack: `${shadow.name} ${shadow.token}`.toLowerCase(),
  }))

  const explicit = pickBestKeywordMatch(mapped, keywords)
  if (explicit) {
    return resolveFromCandidate(explicit, explicit.shadow.value, "explicit")
  }

  const inferredShadow = infer()
  if (inferredShadow) {
    diagnostics.push(
      buildDiagnostic(slot, "info", `预览已根据现有阴影集合推断 ${slot}。`)
    )
    return {
      value: inferredShadow.value,
      resolution: "inferred"         ,
      token: inferredShadow.token || undefined,
      label: inferredShadow.name || undefined,
    }
  }

  diagnostics.push(
    buildDiagnostic(slot, "warning", `缺少 ${slot}；预览已使用备用阴影。`)
  )

  return { value: fallback, resolution: "fallback"          }
}

function buildButtons(
  semantics                            ,
  surfaces
) {
  const primaryForeground = readableForeground(semantics.primary.value)
  const secondaryForeground = semantics.primary.value
  const ghostBackground = toRgba(semantics.muted.value, 0.14)

  return {
    primary: {
      label: "主要",
      variant: "primary",
      background: semantics.primary.value,
      foreground: primaryForeground,
      border: semantics.primary.value,
      shadow: surfaces.buttonShadow.value,
      radius: surfaces.buttonRadius.value,
    }                              ,
    secondary: {
      label: "次要",
      variant: "secondary",
      background: semantics.surface.value,
      foreground: secondaryForeground,
      border: semantics.primary.value,
      shadow: "none",
      radius: surfaces.buttonRadius.value,
    }                              ,
    ghost: {
      label: "透明",
      variant: "ghost",
      background: ghostBackground,
      foreground: semantics.text.value,
      border: semantics.border.value,
      shadow: "none",
      radius: surfaces.buttonRadius.value,
    }                              ,
  }
}

function buildFields(
  colors                            ,
  surfaces
) {
  const shared = {
    background: colors.background.value,
    foreground: colors.text.value,
    border: colors.border.value,
    radius: surfaces.inputRadius.value,
    placeholder: colors.muted.value,
  }

  return {
    input: {
      label: "邮箱地址",
      kind: "input",
      ...shared,
    }                             ,
    textarea: {
      label: "项目备注",
      kind: "textarea",
      ...shared,
    }                             ,
    select: {
      label: "主题模式",
      kind: "select",
      ...shared,
    }                             ,
  }
}

function buildBadges(colors                            ) {
  return [
    {
      label: "主要",
      background: colors.primary.value,
      foreground: readableForeground(colors.primary.value),
    },
    {
      label: "中性",
      background: toRgba(colors.muted.value, 0.18),
      foreground: colors.text.value,
    },
    {
      label: "成功",
      background: colors.success.value,
      foreground: readableForeground(colors.success.value),
    },
    {
      label: "警告",
      background: colors.warning.value,
      foreground: readableForeground(
        colors.warning.value,
        "#ffffff",
        "#111827"
      ),
    },
    {
      label: "危险",
      background: colors.danger.value,
      foreground: readableForeground(colors.danger.value),
    },
  ]
}

function buildAlerts(colors                            ) {
  return [
    {
      tone: "success",
      background: toRgba(colors.success.value, 0.1),
      foreground: colors.success.value,
      border: toRgba(colors.success.value, 0.25),
    },
    {
      tone: "warning",
      background: toRgba(colors.warning.value, 0.12),
      foreground: colors.text.value,
      border: toRgba(colors.warning.value, 0.3),
    },
    {
      tone: "danger",
      background: toRgba(colors.danger.value, 0.1),
      foreground: colors.danger.value,
      border: toRgba(colors.danger.value, 0.26),
    },
  ]
}

function buildSurfaceSpec(
  background        ,
  foreground        ,
  border        ,
  shadow        ,
  radius
) {
  return {
    background,
    foreground,
    border,
    shadow,
    radius,
  }
}

function buildCanonicalKit(
  colors                            ,
  surfaces
)                      {
  return {
    buttons: buildButtons(colors, surfaces),
    fields: buildFields(colors, surfaces),
    badges: buildBadges(colors),
    alerts: buildAlerts(colors),
    topBar: buildSurfaceSpec(
      colors.surface.value,
      colors.text.value,
      colors.border.value,
      surfaces.cardShadow.value,
      surfaces.cardRadius.value
    ),
    sectionBlock: buildSurfaceSpec(
      colors.surface.value,
      colors.text.value,
      colors.border.value,
      surfaces.cardShadow.value,
      surfaces.cardRadius.value
    ),
    focusRing: toRgba(colors.primary.value, 0.28),
    disabledOpacity: 0.46,
  }
}

export function buildPreviewSemantics(tokens              )                   {
  const diagnostics                      = []
  const colorCandidates = buildColorCandidates(tokens)
  const typeCandidates = buildTypeCandidates(tokens.typography.typeScale)
  const spacingCandidates = buildNumericCandidates(tokens.spacing, parseLength)
  const radiusCandidates = buildNumericCandidates(tokens.radius, parseLength)

  const background = resolveColorSlot(
    "background",
    colorCandidates,
    diagnostics,
    {
      keywords: ["background", "page", "canvas", "base", "white", "snow"],
      infer: () =>
        pickByMetric(
          colorCandidates,
          (candidate) => candidate.parsed?.lightness ?? null,
          "max"
        ),
      fallback: () => DEFAULT_COLORS.background,
      message: "预览已根据最亮的可用颜色推断 background 槽位。",
    }
  )

  const surface = resolveColorSlot("surface", colorCandidates, diagnostics, {
    keywords: ["surface", "card", "panel", "paper", "container"],
    infer: () =>
      pickByMetric(
        colorCandidates,
        (candidate) => candidate.parsed?.lightness ?? null,
        "max",
        (candidate) =>
          normalizeColor(candidate.item.value) !==
          normalizeColor(background.value)
      ) ??
      colorCandidates.find(
        (candidate) =>
          normalizeColor(candidate.item.value) ===
          normalizeColor(background.value)
      ) ??
      null,
    fallback: () => background.value,
    message: "预览已根据最亮的非背景色推断 surface 槽位。",
  })

  const text = resolveColorSlot("text", colorCandidates, diagnostics, {
    keywords: ["text", "body", "foreground", "ink", "content", "eel", "black"],
    infer: () =>
      pickByMetric(
        colorCandidates,
        (candidate) => candidate.parsed?.luminance ?? null,
        "min"
      ),
    fallback: () => DEFAULT_COLORS.text,
    message: "预览已根据最暗的可用颜色推断 text 槽位。",
  })

  const muted = resolveColorSlot("muted", colorCandidates, diagnostics, {
    keywords: [
      "muted",
      "subtle",
      "secondary",
      "placeholder",
      "caption",
      "quiet",
      "slug",
    ],
    infer: () =>
      pickClosestNumeric(
        colorCandidates
          .map((candidate) => ({
            ...candidate,
            value: candidate.parsed?.lightness ?? null,
            rawValue: candidate.item.value,
          }))
          .filter(
            (candidate) => candidate.parsed && isNeutral(candidate.parsed)
          ),
        0.55
      ) ??
      pickByMetric(
        colorCandidates,
        (candidate) => candidate.parsed?.lightness ?? null,
        "max"
      ),
    fallback: () => DEFAULT_COLORS.muted,
    message: "预览已根据中性色中间调推断 muted 槽位。",
  })

  const border = resolveColorSlot("border", colorCandidates, diagnostics, {
    keywords: [
      "border",
      "divider",
      "outline",
      "stroke",
      "line",
      "hairline",
      "swan",
    ],
    infer: () =>
      colorCandidates.find(
        (candidate) =>
          normalizeColor(candidate.item.value) === normalizeColor(muted.value)
      ) ??
      pickClosestNumeric(
        colorCandidates
          .map((candidate) => ({
            ...candidate,
            value: candidate.parsed?.lightness ?? null,
            rawValue: candidate.item.value,
          }))
          .filter(
            (candidate) => candidate.parsed && isNeutral(candidate.parsed)
          ),
        0.75
      ),
    fallback: () => DEFAULT_COLORS.border,
    message: "预览已根据中性辅助色推断 border 槽位。",
  })

  const primary = resolveColorSlot("primary", colorCandidates, diagnostics, {
    keywords: ["primary", "brand", "action", "accent", "main", "interactive"],
    infer: () =>
      pickByMetric(
        colorCandidates,
        (candidate) => candidate.parsed?.saturation ?? null,
        "max",
        (candidate) =>
          normalizeColor(candidate.item.value) !==
            normalizeColor(background.value) &&
          normalizeColor(candidate.item.value) !==
            normalizeColor(surface.value) &&
          normalizeColor(candidate.item.value) !== normalizeColor(text.value)
      ),
    fallback: () => DEFAULT_COLORS.primary,
    message: "预览已根据饱和度最高的非中性色推断 primary 槽位。",
  })

  const secondary = resolveColorSlot(
    "secondary",
    colorCandidates,
    diagnostics,
    {
      keywords: ["secondary", "support", "highlight", "neutral", "accent"],
      infer: () =>
        pickByMetric(
          colorCandidates,
          (candidate) => candidate.parsed?.saturation ?? null,
          "max",
          (candidate) =>
            normalizeColor(candidate.item.value) !==
              normalizeColor(primary.value) &&
            normalizeColor(candidate.item.value) !==
              normalizeColor(background.value) &&
            normalizeColor(candidate.item.value) !==
              normalizeColor(surface.value)
        ),
      fallback: () => primary.value,
      message: "预览已根据次强强调色推断 secondary 槽位。",
    }
  )

  const success = resolveColorSlot("success", colorCandidates, diagnostics, {
    keywords: ["success", "positive", "confirm"],
    infer: () =>
      colorCandidates.find(
        (candidate) =>
          candidate.parsed !== null && hueInRange(candidate.parsed.hue, 90, 165)
      ) ?? null,
    fallback: () => DEFAULT_COLORS.success,
    message: "预览已根据绿色范围的颜色推断 success 槽位。",
  })

  const warning = resolveColorSlot("warning", colorCandidates, diagnostics, {
    keywords: ["warning", "caution", "amber"],
    infer: () =>
      colorCandidates.find(
        (candidate) =>
          candidate.parsed !== null && hueInRange(candidate.parsed.hue, 28, 70)
      ) ?? null,
    fallback: () => DEFAULT_COLORS.warning,
    message: "预览已根据黄色或橙色推断 warning 槽位。",
  })

  const danger = resolveColorSlot("danger", colorCandidates, diagnostics, {
    keywords: ["danger", "error", "destructive", "critical", "cardinal"],
    // Unparseable colors (parsed === null) must never satisfy the wrap-around
    // red range — the -1 sentinel used to match hue >= 350 || hue <= 20.
    infer: () =>
      colorCandidates.find(
        (candidate) =>
          candidate.parsed !== null && hueInRange(candidate.parsed.hue, 350, 20)
      ) ?? null,
    fallback: () => DEFAULT_COLORS.danger,
    message: "预览已根据红色范围的颜色推断 danger 槽位。",
  })

  const display = resolveTypeSlot("display", typeCandidates, diagnostics, {
    keywords: ["display", "hero"],
    infer: () =>
      pickByMetric(typeCandidates, (candidate) => candidate.value, "max"),
    fallback: DEFAULT_TYPE_STYLES.display,
  })

  const heading = resolveTypeSlot("heading", typeCandidates, diagnostics, {
    keywords: ["heading", "title", "headline", "h1", "h2"],
    infer: () =>
      [...typeCandidates]
        .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))
        .find((candidate) => candidate.item.token !== display.value.token) ??
      null,
    fallback: DEFAULT_TYPE_STYLES.heading,
  })

  const body = resolveTypeSlot("body", typeCandidates, diagnostics, {
    keywords: ["body", "text", "paragraph", "copy", "content"],
    infer: () => pickClosestNumeric(typeCandidates, 16),
    fallback: DEFAULT_TYPE_STYLES.body,
  })

  const label = resolveTypeSlot("label", typeCandidates, diagnostics, {
    keywords: ["label", "button", "ui", "control", "form"],
    infer: () => pickClosestNumeric(typeCandidates, 14),
    fallback: DEFAULT_TYPE_STYLES.label,
  })

  const caption = resolveTypeSlot("caption", typeCandidates, diagnostics, {
    keywords: ["caption", "meta", "eyebrow", "small", "overline"],
    infer: () =>
      pickByMetric(typeCandidates, (candidate) => candidate.value, "min"),
    fallback: DEFAULT_TYPE_STYLES.caption,
  })

  const displayFont = resolveFontSlot(
    "displayFont",
    tokens.typography.fontFamilies,
    diagnostics,
    ["display", "heading", "hero", "title"],
    () => tokens.typography.fontFamilies[0] ?? null,
    "inherit"
  )

  const bodyFont = resolveFontSlot(
    "bodyFont",
    tokens.typography.fontFamilies,
    diagnostics,
    ["body", "text", "ui", "copy", "paragraph"],
    () =>
      tokens.typography.fontFamilies[1] ??
      tokens.typography.fontFamilies[0] ??
      null,
    displayFont.value
  )

  const cardRadius = resolveNumericSlot(
    "cardRadius",
    radiusCandidates,
    diagnostics,
    {
      keywords: ["card", "surface", "container", "panel", "lg"],
      infer: () => pickClosestNumeric(radiusCandidates, 16),
      fallback: "16px",
    }
  )

  const buttonRadius = resolveNumericSlot(
    "buttonRadius",
    radiusCandidates,
    diagnostics,
    {
      keywords: ["button", "pill", "full", "rounded"],
      infer: () =>
        pickByMetric(radiusCandidates, (candidate) => candidate.value, "max") ??
        pickClosestNumeric(radiusCandidates, 999),
      fallback: cardRadius.value,
    }
  )

  const inputRadius = resolveNumericSlot(
    "inputRadius",
    radiusCandidates,
    diagnostics,
    {
      keywords: ["input", "field", "control", "sm", "md"],
      infer: () => pickClosestNumeric(radiusCandidates, 10),
      fallback: cardRadius.value,
    }
  )

  const cardShadow = resolveShadowSlot(
    "cardShadow",
    tokens.shadows,
    diagnostics,
    ["card", "surface", "panel", "shadow-md", "shadow-lg"],
    () => tokens.shadows[0] ?? null,
    "0 12px 30px rgba(15, 23, 42, 0.08)"
  )

  const buttonShadow = resolveShadowSlot(
    "buttonShadow",
    tokens.shadows,
    diagnostics,
    ["button", "interactive", "raised", "press", "shadow-button"],
    () =>
      tokens.shadows.find(
        (shadow) =>
          normalizeColor(shadow.value) === normalizeColor(cardShadow.value)
      ) ??
      tokens.shadows[0] ??
      null,
    cardShadow.value
  )

  const sectionGap = tokens.layout.sectionGap
    ? {
        value: tokens.layout.sectionGap,
        resolution: "explicit"         ,
      }
    : resolveNumericSlot("sectionGap", spacingCandidates, diagnostics, {
        keywords: ["section", "page", "layout", "64"],
        infer: () => pickClosestNumeric(spacingCandidates, 64),
        fallback: "64px",
      })

  const cardPadding = tokens.layout.cardPadding
    ? {
        value: tokens.layout.cardPadding,
        resolution: "explicit"         ,
      }
    : resolveNumericSlot("cardPadding", spacingCandidates, diagnostics, {
        keywords: ["card", "panel", "container", "24"],
        infer: () => pickClosestNumeric(spacingCandidates, 24),
        fallback: "24px",
      })

  const elementGap = tokens.layout.elementGap
    ? {
        value: tokens.layout.elementGap,
        resolution: "explicit"         ,
      }
    : resolveNumericSlot("elementGap", spacingCandidates, diagnostics, {
        keywords: ["element", "gap", "space", "16"],
        infer: () => pickClosestNumeric(spacingCandidates, 16),
        fallback: "16px",
      })

  const maxContentWidth = tokens.layout.maxContentWidth
    ? {
        value: tokens.layout.maxContentWidth,
        resolution: "explicit"         ,
      }
    : {
        value: "960px",
        resolution: "fallback"         ,
      }

  if (maxContentWidth.resolution === "fallback") {
    diagnostics.push(
      buildDiagnostic(
        "maxContentWidth",
        "warning",
        "缺少最大内容宽度；预览已使用备用宽度 960px。"
      )
    )
  }

  const semanticsWithoutKit = {
    colors: {
      primary,
      secondary,
      surface,
      background,
      text,
      muted,
      border,
      success,
      warning,
      danger,
    },
    typography: {
      displayFont,
      bodyFont,
      display,
      heading,
      body,
      label,
      caption,
    },
    surfaces: {
      cardRadius,
      buttonRadius,
      inputRadius,
      cardShadow,
      buttonShadow,
    },
    layout: {
      sectionGap,
      cardPadding,
      elementGap,
      maxContentWidth,
    },
  }

  return {
    ...semanticsWithoutKit,
    canonicalKit: buildCanonicalKit(
      semanticsWithoutKit.colors,
      semanticsWithoutKit.surfaces
    ),
    diagnostics,
  }
}
