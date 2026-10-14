import { marked } from "../../marked.mjs"
import { buildPreviewSemantics } from "../preview/build-preview-semantics.mjs"



















// marked v18 removed the Tokens namespace.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
































const EMPTY_RAW              = {
  components: [],
  dosDonts: { dos: [], donts: [] },
  imagery: "",
  layout: "",
}

const EMPTY_TOKENS               = {
  meta: { name: "", description: "", theme: "light" },
  colors: [],
  gradients: [],
  typography: { fontFamilies: [], typeScale: [] },
  spacing: [],
  radius: [],
  shadows: [],
  layout: {
    sectionGap: "",
    cardPadding: "",
    elementGap: "",
    maxContentWidth: "",
  },
  components: [],
}

function clean(text        )         {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
}

function splitH2(tokens         )            {
  const sections            = []
  let current                 = null

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      if (current) sections.push(current)
      current = { title: clean(token.text), tokens: [] }
      continue
    }

    if (current) {
      current.tokens.push(token)
      continue
    }

    if (!sections.length) sections.push({ title: "__preamble__", tokens: [] })
    sections[0].tokens.push(token)
  }

  if (current) sections.push(current)
  return sections
}

function splitH3(tokens         )            {
  const sections            = []
  let current                 = null

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 3) {
      if (current) sections.push(current)
      current = { title: clean(token.text), tokens: [] }
      continue
    }

    if (current) current.tokens.push(token)
  }

  if (current) sections.push(current)
  return sections
}

function parseTableRows(token       )             {
  return (token.rows || []).map((row         ) =>
    row.map((cell       ) => clean(cell.text || ""))
  )
}

function findTable(tokens         )               {
  return tokens.find((token       ) => token.type === "table") ?? null
}

function findAllTables(tokens         )          {
  return tokens.filter((token       ) => token.type === "table")
}

function listItems(tokens         )           {
  const items           = []

  for (const token of tokens) {
    if (token.type !== "list") continue
    for (const item of token.items || []) {
      items.push(clean(item.text || ""))
    }
  }

  return items
}

function findParagraphs(tokens         )         {
  return tokens
    .filter((token       ) => token.type === "paragraph")
    .map((token       ) => clean(token.text || ""))
    .join("\n\n")
}

function bulletValue(items          , key        )         {
  const lowerKey = key.toLowerCase()
  for (const item of items) {
    if (item.toLowerCase().startsWith(`${lowerKey}:`)) {
      return item.slice(key.length + 1).trim()
    }
  }
  return ""
}

function splitLabeledParagraph(value        , key        ) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = new RegExp(
    `^${escapedKey}:\\s*([^\\r\\n]*)(?:\\r?\\n+([\\s\\S]*))?$`,
    "i"
  ).exec(value)
  if (!match) return null
  return {
    value: match[1].trim(),
    remainder: match[2]?.trim() ?? "",
  }
}

function parsePreamble(tokens         ) {
  let name = ""
  let description = ""
  let theme                   = "light"

  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 1) {
      name = clean(token.text)
        .replace(/\s*[-—]\s*(?:Style\s*Reference|样式参考)\s*$/i, "")
        .trim()
    }

    if (token.type === "blockquote") {
      description = clean(token.text)
    }

    if (token.type === "paragraph") {
      const match = clean(token.text).match(/theme:\s*(light|dark)/i)
      if (match) theme = match[1].toLowerCase()
    }
  }

  return { name, description, theme }
}

function splitFontHeading(title        ) {
  const parts = title.split(/\s(?:-|—|·|路)\s/)
  const name = parts[0]?.trim() ?? title
  const tokenMatch = title.match(/(--[\w-]+)/)
  return {
    name,
    token: tokenMatch?.[1] ?? "",
  }
}

function parseFontWeights(value        ) {
  return value
    .split(",")
    .map((weight) => Number.parseInt(weight.trim(), 10))
    .filter((weight) => !Number.isNaN(weight))
}

function fontNameFromSubstitute(substitute        , token        ) {
  const firstFamily = substitute
    .split(",")[0]
    ?.trim()
    .replace(/^["']|["']$/g, "")
  if (firstFamily) return firstFamily

  return token
    .replace(/^--font-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

/**
 * Some otherwise complete DESIGN.md files use a compact paragraph instead of
 * an H3 + bullet list for each family:
 *
 * **`--font-body`**
 * **Substitute:** Inter, sans-serif
 * **Weights:** 400, 600
 * **Role:** Body copy
 *
 * Treat that as an equivalent source grammar so a present font family is not
 * reported as missing merely because of Markdown presentation.
 */
function parseCompactFontParagraph(token       )                         {
  if (token.type !== "paragraph") return null

  const lines = clean(token.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const tokenMatch = /^(--font-[a-z0-9_-]+)$/i.exec(lines[0] ?? "")
  if (!tokenMatch) return null

  const fields = lines.slice(1)
  const substitute = bulletValue(fields, "Substitute")
  const weights = bulletValue(fields, "Weights")
  const role = bulletValue(fields, "Role")
  if (!substitute && !weights && !role) return null

  return {
    name: fontNameFromSubstitute(substitute, tokenMatch[1]),
    token: tokenMatch[1],
    substitute,
    weights: parseFontWeights(weights),
    role,
  }
}

function parseColors(tokens         )


  {
  const colors               = []
  const gradients                  = []

  for (const table of findAllTables(tokens)) {
    for (const row of parseTableRows(table)) {
      if (row.length < 4) continue

      if (row[1].includes("linear-gradient")) {
        gradients.push({
          name: row[0],
          value: row[1],
          token: row[2],
          role: row[3],
        })
      } else {
        colors.push({
          name: row[0],
          value: row[1],
          token: row[2],
          role: row[3],
        })
      }
    }
  }

  for (const section of splitH3(tokens)) {
    const title = section.title.toLowerCase()
    if (!title.includes("gradient") && !title.includes("decorative")) continue

    const table = findTable(section.tokens)
    if (!table) continue

    for (const row of parseTableRows(table)) {
      if (row.length < 4) continue

      if (!gradients.some((gradient) => gradient.token === row[2])) {
        gradients.push({
          name: row[0],
          value: row[1],
          token: row[2],
          role: row[3],
        })
      }
    }
  }

  return { colors, gradients }
}

function parseTypography(tokens         )


  {
  const fontFamilies                    = []
  const typeScale                   = []

  for (const token of tokens) {
    const font = parseCompactFontParagraph(token)
    if (font && !fontFamilies.some((item) => item.token === font.token)) {
      fontFamilies.push(font)
    }
  }

  for (const section of splitH3(tokens)) {
    if (section.title.toLowerCase() === "type scale") {
      const table = findTable(section.tokens)
      if (!table) continue

      for (const row of parseTableRows(table)) {
        if (row.length < 5) continue
        typeScale.push({
          role: row[0],
          size: row[1],
          lineHeight: row[2],
          letterSpacing: /^[\-–—]$/.test(row[3].trim()) ? "" : row[3],
          token: row[4],
        })
      }
      continue
    }

    const items = listItems(section.tokens)
    const heading = splitFontHeading(section.title)
    const substitute = bulletValue(items, "Substitute")
    const weights = bulletValue(items, "Weights")
    // A grouping heading such as "Font Families" is documentation, not a font
    // token. Only parse a family when the heading carries a canonical token or
    // the block contains actual font-family fields. This avoids phantom
    // `missing-token` failures that no amount of AI rewriting can resolve.
    if (!heading.token && !substitute && !weights) continue

    const font = {
      name: heading.name,
      token: heading.token,
      substitute,
      weights: parseFontWeights(weights),
      role: bulletValue(items, "Role"),
    }
    const existingIndex = fontFamilies.findIndex(
      (item) => item.token && item.token === font.token
    )
    if (existingIndex >= 0) {
      fontFamilies[existingIndex] = font
    } else {
      fontFamilies.push(font)
    }
  }

  return { fontFamilies, typeScale }
}

function parseSpacingAndShapes(tokens         ) {
  const spacing                 = []
  const radius                = []
  const shadows                = []
  const allItems = listItems(tokens)
  const density = bulletValue(allItems, "Density")
  let layout              = {
    sectionGap: "",
    cardPadding: "",
    elementGap: "",
    maxContentWidth: "",
  }

  for (const section of splitH3(tokens)) {
    const title = section.title.toLowerCase()

    if (title.includes("spacing")) {
      const table = findTable(section.tokens)
      if (!table) continue
      for (const row of parseTableRows(table)) {
        if (row.length >= 3) {
          spacing.push({ name: row[0], value: row[1], token: row[2] })
        }
      }
      continue
    }

    if (title.includes("radius") || title.includes("border")) {
      const table = findTable(section.tokens)
      if (!table) continue
      for (const row of parseTableRows(table)) {
        if (row.length >= 2) {
          radius.push({
            name: row[0],
            value: row[1],
            token:
              row[2] ||
              `--radius-${row[0]
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`,
          })
        }
      }
      continue
    }

    if (title.includes("shadow")) {
      const table = findTable(section.tokens)
      if (!table) continue
      for (const row of parseTableRows(table)) {
        if (row.length >= 3) {
          shadows.push({ name: row[0], value: row[1], token: row[2] })
        }
      }
      continue
    }

    if (title === "layout") {
      const items = listItems(section.tokens)
      layout = {
        sectionGap: bulletValue(items, "Section gap"),
        cardPadding: bulletValue(items, "Card padding"),
        elementGap: bulletValue(items, "Element gap"),
        maxContentWidth:
          bulletValue(items, "Max content width") ||
          bulletValue(items, "Page max-width") ||
          bulletValue(items, "Page max width") ||
          bulletValue(items, "Max width"),
      }
    }
  }

  return { spacing, radius, shadows, layout, density }
}

function parseComponents(tokens         )


  {
  const components                   = []
  const raw               = []

  for (const section of splitH3(tokens)) {
    const paragraphs = section.tokens
      .filter((token       ) => token.type === "paragraph")
      .map((token       ) => clean(token.text || ""))
    const items = listItems(section.tokens)
    let role = ""
    const bodyParagraphs           = []
    const bodyItems           = []

    for (const paragraph of paragraphs) {
      const labeled = splitLabeledParagraph(paragraph, "Role")
      if (!labeled) {
        bodyParagraphs.push(paragraph)
        continue
      }
      if (!role) role = labeled.value
      if (labeled.remainder) bodyParagraphs.push(labeled.remainder)
    }

    for (const item of items) {
      const labeled = splitLabeledParagraph(item, "Role")
      if (!labeled) {
        bodyItems.push(item)
        continue
      }
      if (!role) role = labeled.value
      if (labeled.remainder) bodyItems.push(labeled.remainder)
    }

    if (!role) role = bulletValue([...paragraphs, ...items], "Role")
    const body = [
      ...bodyParagraphs,
      ...bodyItems.map((item) => `- ${item}`),
    ].join("\n\n")

    components.push({
      name: section.title,
      role,
      description: body,
    })

    raw.push({
      heading: section.title,
      role,
      body,
    })
  }

  return { components, raw }
}

function parseDosDonts(tokens         )                                     {
  let dos           = []
  let donts           = []

  for (const section of splitH3(tokens)) {
    const title = section.title.toLowerCase()
    const items = listItems(section.tokens)
    if (title.includes("do") && !title.includes("don")) {
      dos = items
    }
    if (title.includes("don")) {
      donts = items
    }
  }

  if (dos.length === 0 && donts.length === 0) {
    for (const item of listItems(tokens)) {
      if (/^do not|^don't|^never|^avoid/i.test(item)) {
        donts.push(item)
      } else {
        dos.push(item)
      }
    }
  }

  return { dos, donts }
}

function tokenRaw(token       )         {
  return typeof token.raw === "string" ? token.raw : ""
}

function annotateTokens(tokens         )                 {
  let offset = 0

  return tokens.map((token, index) => {
    const raw = tokenRaw(token)
    const annotated = {
      token,
      raw,
      start: offset,
      end: offset + raw.length,
      index,
    }
    offset += raw.length
    return annotated
  })
}

function tokensToRaw(tokens                )         {
  return tokens.map((token) => token.raw).join("")
}

function isSpaceToken(token                          )          {
  return token?.token.type === "space"
}

// Match "do", "dos", "don't(s)", "dont(s)" or "guideline(s)" as whole words so
// titles like "Documentation" or "Download" are not misclassified.
const DOS_DONTS_TITLE_PATTERN = /\bdo(?:'?s)?\b|\bdon'?ts?\b|\bguidelines?\b/

function isDosDontsTitle(lowerTitle        )          {
  return DOS_DONTS_TITLE_PATTERN.test(lowerTitle)
}

function getTopLevelSectionKind(title        )                      {
  const lowerTitle = clean(title).toLowerCase()

  if (lowerTitle === "__preamble__") return "preamble"
  if (lowerTitle.includes("color")) return "colors"
  if (lowerTitle.includes("typography")) return "typography"
  if (lowerTitle.includes("spacing") || lowerTitle.includes("shape")) {
    return "spacing-shapes"
  }
  if (lowerTitle.includes("component")) return "components"
  // Layout must win over the dos/donts keywords so "Layout Guidelines" is
  // treated as layout.
  if (lowerTitle.includes("layout")) return "layout"
  if (isDosDontsTitle(lowerTitle)) return "dos-donts"
  if (lowerTitle.includes("imagery") || lowerTitle.includes("image"))
    return "imagery"
  return "unknown"
}

function splitTopLevelSections(
  tokens
)                           {
  if (tokens.length === 0) return []

  const headingIndexes = tokens
    .filter(
      (token) => token.token.type === "heading" && token.token.depth === 2
    )
    .map((token) => token.index)

  const sections                           = []

  if (headingIndexes.length === 0) {
    sections.push({
      kind: "preamble",
      title: "__preamble__",
      tokens,
    })
    return sections
  }

  if (headingIndexes[0] > 0) {
    sections.push({
      kind: "preamble",
      title: "__preamble__",
      tokens: tokens.slice(0, headingIndexes[0]),
    })
  }

  for (let index = 0; index < headingIndexes.length; index += 1) {
    const start = headingIndexes[index]
    const end = headingIndexes[index + 1] ?? tokens.length
    const sectionTokens = tokens.slice(start, end)
    const heading = sectionTokens[0]
    const title = heading?.token.text || ""

    sections.push({
      kind: getTopLevelSectionKind(title),
      title,
      tokens: sectionTokens,
    })
  }

  return sections
}

function createSkeletonBlock(
  tokens                ,
  order        ,
  {
    kind,
    title,
    depth,
    modeled,
    dataKey,
    headingText,
  }







)                          {
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  const start = first?.start ?? 0
  const end = last?.end ?? start

  return {
    id: dataKey ? `${dataKey}:${order}` : `${kind}:${order}:${start}`,
    kind,
    raw: tokensToRaw(tokens),
    start,
    end,
    order,
    depth,
    modeled,
    title,
    headingText,
    dataKey,
  }
}

function advanceWithTrailingSpaces(
  tokens                ,
  start
)         {
  let end = start + 1
  while (end < tokens.length && isSpaceToken(tokens[end])) {
    end += 1
  }
  return end
}

function findNextNonSpace(tokens                , start        )         {
  let index = start
  while (index < tokens.length && isSpaceToken(tokens[index])) {
    index += 1
  }
  return index
}

function consumeUntilNextH3(tokens                , start        )         {
  let end = start + 1
  while (end < tokens.length) {
    const current = tokens[end]
    if (current.token.type === "heading" && current.token.depth === 3) break
    end += 1
  }
  return end
}

function isGradientHeading(title        )          {
  const lowerTitle = clean(title).toLowerCase()
  return lowerTitle.includes("gradient") || lowerTitle.includes("decorative")
}

function isTypeScaleHeading(title        )          {
  return clean(title).toLowerCase() === "type scale"
}

function isFontFamilyHeading(
  title        ,
  listToken
)          {
  const normalizedTitle = clean(title).toLowerCase()
  const raw = listToken?.raw.toLowerCase() ?? ""

  return (
    normalizedTitle.includes("font") ||
    raw.includes("substitute") ||
    raw.includes("weights")
  )
}

function pushTopLevelHeadingBlock(
  section                        ,
  blocks                           ,
  nextOrder
)         {
  const headingEnd = advanceWithTrailingSpaces(section.tokens, 0)

  blocks.push(
    createSkeletonBlock(section.tokens.slice(0, headingEnd), nextOrder(), {
      kind: "heading",
      title: clean(section.title),
      depth: 2,
      modeled: false,
      headingText: section.title,
    })
  )

  return headingEnd
}

function pushUnknownBlock(
  tokens                ,
  blocks                           ,
  nextOrder              ,
  title = "Unknown block",
  depth = 0
) {
  if (tokens.length === 0) return

  blocks.push(
    createSkeletonBlock(tokens, nextOrder(), {
      kind: "unknown",
      title,
      depth,
      modeled: false,
    })
  )
}

function buildColorSkeleton(
  section                        ,
  blocks                           ,
  nextOrder
) {
  let cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)
  let colorsCaptured = false

  while (cursor < section.tokens.length) {
    const current = section.tokens[cursor]

    if (current.token.type === "heading" && current.token.depth === 3) {
      const nextTokenIndex = findNextNonSpace(section.tokens, cursor + 1)
      const headingTitle = current.token.text || ""

      if (
        isGradientHeading(headingTitle) &&
        nextTokenIndex < section.tokens.length &&
        section.tokens[nextTokenIndex].token.type === "table"
      ) {
        const blockEnd = advanceWithTrailingSpaces(
          section.tokens,
          nextTokenIndex
        )
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(cursor, blockEnd),
            nextOrder(),
            {
              kind: "gradients",
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey: "tokens.gradients",
              headingText: headingTitle,
            }
          )
        )
        cursor = blockEnd
        continue
      }

      const unknownEnd = consumeUntilNextH3(section.tokens, cursor)
      pushUnknownBlock(
        section.tokens.slice(cursor, unknownEnd),
        blocks,
        nextOrder,
        clean(headingTitle),
        3
      )
      cursor = unknownEnd
      continue
    }

    if (current.token.type === "table" && !colorsCaptured) {
      const blockEnd = advanceWithTrailingSpaces(section.tokens, cursor)
      blocks.push(
        createSkeletonBlock(
          section.tokens.slice(cursor, blockEnd),
          nextOrder(),
          {
            kind: "colors",
            title: "颜色",
            depth: 0,
            modeled: true,
            dataKey: "tokens.colors",
          }
        )
      )
      colorsCaptured = true
      cursor = blockEnd
      continue
    }

    const unknownEnd = advanceWithTrailingSpaces(section.tokens, cursor)
    pushUnknownBlock(
      section.tokens.slice(cursor, unknownEnd),
      blocks,
      nextOrder
    )
    cursor = unknownEnd
  }
}

function buildTypographySkeleton(
  section                        ,
  blocks                           ,
  nextOrder
) {
  let cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)
  let fontIndex = 0

  while (cursor < section.tokens.length) {
    const current = section.tokens[cursor]
    const compactFont = parseCompactFontParagraph(current.token)

    if (compactFont) {
      const blockEnd = advanceWithTrailingSpaces(section.tokens, cursor)
      blocks.push(
        createSkeletonBlock(
          section.tokens.slice(cursor, blockEnd),
          nextOrder(),
          {
            kind: "typography-font",
            title: compactFont.name,
            depth: 0,
            modeled: true,
            dataKey: `tokens.typography.fontFamilies.${fontIndex}`,
          }
        )
      )
      fontIndex += 1
      cursor = blockEnd
      continue
    }

    if (current.token.type === "heading" && current.token.depth === 3) {
      const headingTitle = current.token.text || ""
      const nextTokenIndex = findNextNonSpace(section.tokens, cursor + 1)
      const nextToken = section.tokens[nextTokenIndex]

      if (
        isTypeScaleHeading(headingTitle) &&
        nextTokenIndex < section.tokens.length &&
        nextToken?.token.type === "table"
      ) {
        const blockEnd = advanceWithTrailingSpaces(
          section.tokens,
          nextTokenIndex
        )
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(cursor, blockEnd),
            nextOrder(),
            {
              kind: "typography-type-scale",
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey: "tokens.typography.typeScale",
              headingText: headingTitle,
            }
          )
        )
        cursor = blockEnd
        continue
      }

      if (
        nextTokenIndex < section.tokens.length &&
        nextToken?.token.type === "list" &&
        isFontFamilyHeading(headingTitle, nextToken)
      ) {
        const blockEnd = advanceWithTrailingSpaces(
          section.tokens,
          nextTokenIndex
        )
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(cursor, blockEnd),
            nextOrder(),
            {
              kind: "typography-font",
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey: `tokens.typography.fontFamilies.${fontIndex}`,
              headingText: headingTitle,
            }
          )
        )
        fontIndex += 1
        cursor = blockEnd
        continue
      }

      const unknownEnd = consumeUntilNextH3(section.tokens, cursor)
      pushUnknownBlock(
        section.tokens.slice(cursor, unknownEnd),
        blocks,
        nextOrder,
        clean(headingTitle),
        3
      )
      cursor = unknownEnd
      continue
    }

    const unknownEnd = advanceWithTrailingSpaces(section.tokens, cursor)
    pushUnknownBlock(
      section.tokens.slice(cursor, unknownEnd),
      blocks,
      nextOrder
    )
    cursor = unknownEnd
  }
}

function buildSpacingSkeleton(
  section                        ,
  blocks                           ,
  nextOrder
) {
  let cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)

  while (cursor < section.tokens.length) {
    const current = section.tokens[cursor]

    if (current.token.type === "heading" && current.token.depth === 3) {
      const headingTitle = current.token.text || ""
      const lowerHeadingTitle = clean(headingTitle).toLowerCase()
      const nextTokenIndex = findNextNonSpace(section.tokens, cursor + 1)
      const nextToken = section.tokens[nextTokenIndex]

      const pushModeledBlock = (
        kind                     ,
        dataKey
      ) => {
        const blockEnd = advanceWithTrailingSpaces(
          section.tokens,
          nextTokenIndex
        )
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(cursor, blockEnd),
            nextOrder(),
            {
              kind,
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey,
              headingText: headingTitle,
            }
          )
        )
        cursor = blockEnd
      }

      if (
        lowerHeadingTitle.includes("spacing") &&
        nextToken?.token.type === "table"
      ) {
        pushModeledBlock("spacing", "tokens.spacing")
        continue
      }

      if (
        (lowerHeadingTitle.includes("radius") ||
          lowerHeadingTitle.includes("border")) &&
        nextToken?.token.type === "table"
      ) {
        pushModeledBlock("radius", "tokens.radius")
        continue
      }

      if (
        lowerHeadingTitle.includes("shadow") &&
        nextToken?.token.type === "table"
      ) {
        pushModeledBlock("shadows", "tokens.shadows")
        continue
      }

      if (lowerHeadingTitle === "layout" && nextToken?.token.type === "list") {
        pushModeledBlock("layout-tokens", "tokens.layout")
        continue
      }

      const unknownEnd = consumeUntilNextH3(section.tokens, cursor)
      pushUnknownBlock(
        section.tokens.slice(cursor, unknownEnd),
        blocks,
        nextOrder,
        clean(headingTitle),
        3
      )
      cursor = unknownEnd
      continue
    }

    const unknownEnd = advanceWithTrailingSpaces(section.tokens, cursor)
    pushUnknownBlock(
      section.tokens.slice(cursor, unknownEnd),
      blocks,
      nextOrder
    )
    cursor = unknownEnd
  }
}

function buildComponentsSkeleton(
  section                        ,
  blocks                           ,
  nextOrder
) {
  let cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)
  let componentIndex = 0

  while (cursor < section.tokens.length) {
    const current = section.tokens[cursor]

    if (current.token.type === "heading" && current.token.depth === 3) {
      const headingTitle = current.token.text || ""
      const blockEnd = consumeUntilNextH3(section.tokens, cursor)

      blocks.push(
        createSkeletonBlock(
          section.tokens.slice(cursor, blockEnd),
          nextOrder(),
          {
            kind: "components",
            title: clean(headingTitle),
            depth: 3,
            modeled: true,
            dataKey: `tokens.components.${componentIndex}`,
            headingText: headingTitle,
          }
        )
      )
      componentIndex += 1
      cursor = blockEnd
      continue
    }

    const unknownEnd = advanceWithTrailingSpaces(section.tokens, cursor)
    pushUnknownBlock(
      section.tokens.slice(cursor, unknownEnd),
      blocks,
      nextOrder
    )
    cursor = unknownEnd
  }
}

function buildDosDontsSkeleton(
  section                        ,
  blocks                           ,
  nextOrder
) {
  const hasNestedHeadings = section.tokens.some(
    (token) => token.token.type === "heading" && token.token.depth === 3
  )
  const cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)

  if (!hasNestedHeadings) {
    if (cursor < section.tokens.length) {
      blocks.push(
        createSkeletonBlock(section.tokens.slice(cursor), nextOrder(), {
          kind: "dos",
          title: clean(section.title),
          depth: 0,
          modeled: true,
          dataKey: "rawSections.dosDonts",
        })
      )
    } else {
      const headingBlock = blocks.at(-1)
      const insertionPoint = headingBlock?.end ?? 0
      const order = nextOrder()
      blocks.push({
        id: `rawSections.dosDonts:${order}`,
        kind: "dos",
        raw: "",
        start: insertionPoint,
        end: insertionPoint,
        order,
        depth: 0,
        modeled: true,
        title: clean(section.title),
        dataKey: "rawSections.dosDonts",
      })
    }
    return
  }

  let nextCursor = cursor

  while (nextCursor < section.tokens.length) {
    const current = section.tokens[nextCursor]

    if (current.token.type === "heading" && current.token.depth === 3) {
      const headingTitle = current.token.text || ""
      const lowerHeadingTitle = clean(headingTitle).toLowerCase()
      const blockEnd = consumeUntilNextH3(section.tokens, nextCursor)

      if (lowerHeadingTitle.includes("don")) {
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(nextCursor, blockEnd),
            nextOrder(),
            {
              kind: "donts",
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey: "rawSections.donts",
              headingText: headingTitle,
            }
          )
        )
        nextCursor = blockEnd
        continue
      }

      if (lowerHeadingTitle.includes("do")) {
        blocks.push(
          createSkeletonBlock(
            section.tokens.slice(nextCursor, blockEnd),
            nextOrder(),
            {
              kind: "dos",
              title: clean(headingTitle),
              depth: 3,
              modeled: true,
              dataKey: "rawSections.dos",
              headingText: headingTitle,
            }
          )
        )
        nextCursor = blockEnd
        continue
      }

      pushUnknownBlock(
        section.tokens.slice(nextCursor, blockEnd),
        blocks,
        nextOrder,
        clean(headingTitle),
        3
      )
      nextCursor = blockEnd
      continue
    }

    const unknownEnd = advanceWithTrailingSpaces(section.tokens, nextCursor)
    pushUnknownBlock(
      section.tokens.slice(nextCursor, unknownEnd),
      blocks,
      nextOrder
    )
    nextCursor = unknownEnd
  }
}

function buildProseSectionSkeleton(
  section                        ,
  blocks                           ,
  nextOrder              ,
  kind                     ,
  dataKey
) {
  const cursor = pushTopLevelHeadingBlock(section, blocks, nextOrder)

  if (cursor >= section.tokens.length) {
    const headingBlock = blocks.at(-1)
    const insertionPoint = headingBlock?.end ?? 0
    const order = nextOrder()
    blocks.push({
      id: `${dataKey}:${order}`,
      kind,
      raw: "",
      start: insertionPoint,
      end: insertionPoint,
      order,
      depth: 0,
      modeled: true,
      title: clean(section.title),
      dataKey,
    })
    return
  }

  blocks.push(
    createSkeletonBlock(section.tokens.slice(cursor), nextOrder(), {
      kind,
      title: clean(section.title),
      depth: 0,
      modeled: true,
      dataKey,
    })
  )
}

function buildSectionSkeleton(tokens         )                            {
  const indexedTokens = annotateTokens(tokens)
  const sections = splitTopLevelSections(indexedTokens)
  const blocks                            = []
  let order = 0
  const nextOrder = () => {
    order += 1
    return order
  }

  for (const section of sections) {
    if (section.tokens.length === 0) continue

    if (section.kind === "preamble") {
      blocks.push(
        createSkeletonBlock(section.tokens, nextOrder(), {
          kind: "preamble",
          title: "前言",
          depth: 0,
          modeled: true,
          dataKey: "tokens.meta",
        })
      )
      continue
    }

    if (section.kind === "colors") {
      buildColorSkeleton(section, blocks, nextOrder)
      continue
    }

    if (section.kind === "typography") {
      buildTypographySkeleton(section, blocks, nextOrder)
      continue
    }

    if (section.kind === "spacing-shapes") {
      buildSpacingSkeleton(section, blocks, nextOrder)
      continue
    }

    if (section.kind === "components") {
      buildComponentsSkeleton(section, blocks, nextOrder)
      continue
    }

    if (section.kind === "dos-donts") {
      buildDosDontsSkeleton(section, blocks, nextOrder)
      continue
    }

    if (section.kind === "imagery") {
      buildProseSectionSkeleton(
        section,
        blocks,
        nextOrder,
        "imagery",
        "rawSections.imagery"
      )
      continue
    }

    if (section.kind === "layout") {
      buildProseSectionSkeleton(
        section,
        blocks,
        nextOrder,
        "layout-prose",
        "rawSections.layout"
      )
      continue
    }

    blocks.push(
      createSkeletonBlock(section.tokens, nextOrder(), {
        kind: "unknown",
        title: clean(section.title),
        depth: 2,
        modeled: false,
        headingText: section.title,
      })
    )
  }

  return blocks
}

export function parseDesignMd(content        )              {
  const markdownTokens = marked.lexer(content)
  const sections = splitH2(markdownTokens)
  const result              = {
    tokens: {
      ...EMPTY_TOKENS,
      meta: { ...EMPTY_TOKENS.meta },
      typography: { ...EMPTY_TOKENS.typography },
      layout: { ...EMPTY_TOKENS.layout },
    },
    rawSections: {
      ...EMPTY_RAW,
      dosDonts: { ...EMPTY_RAW.dosDonts },
    },
    sectionSkeleton: buildSectionSkeleton(markdownTokens),
    previewSemantics: buildPreviewSemantics(EMPTY_TOKENS),
  }

  for (const section of sections) {
    const title = section.title.toLowerCase()

    if (section.title === "__preamble__") {
      const preamble = parsePreamble(section.tokens)
      result.tokens.meta.name = preamble.name
      result.tokens.meta.description = preamble.description
      result.tokens.meta.theme = preamble.theme
      continue
    }

    if (title.includes("color")) {
      const parsed = parseColors(section.tokens)
      result.tokens.colors = parsed.colors
      result.tokens.gradients = parsed.gradients
      continue
    }

    if (title.includes("typography")) {
      const parsed = parseTypography(section.tokens)
      result.tokens.typography.fontFamilies = parsed.fontFamilies
      result.tokens.typography.typeScale = parsed.typeScale
      continue
    }

    if (title.includes("spacing") || title.includes("shape")) {
      const parsed = parseSpacingAndShapes(section.tokens)
      result.tokens.spacing = parsed.spacing
      result.tokens.radius = parsed.radius
      result.tokens.shadows = parsed.shadows
      result.tokens.layout = parsed.layout
      if (parsed.density) result.rawSections.density = parsed.density
      continue
    }

    if (title.includes("component")) {
      const parsed = parseComponents(section.tokens)
      result.tokens.components = parsed.components
      result.rawSections.components = parsed.raw
      continue
    }

    // Layout must win over the dos/donts keywords so "Layout Guidelines" is
    // treated as layout (kept in sync with getTopLevelSectionKind).
    if (title.includes("layout")) {
      result.rawSections.layout = findParagraphs(section.tokens)
      const items = listItems(section.tokens)
      if (items.length > 0) {
        const sectionGap = bulletValue(items, "Section gap")
        const cardPadding = bulletValue(items, "Card padding")
        const elementGap = bulletValue(items, "Element gap")
        const maxContentWidth =
          bulletValue(items, "Max content width") ||
          bulletValue(items, "Page max-width") ||
          bulletValue(items, "Page max width") ||
          bulletValue(items, "Max width")
        if (sectionGap || cardPadding || elementGap || maxContentWidth) {
          result.tokens.layout = {
            sectionGap: sectionGap || result.tokens.layout.sectionGap,
            cardPadding: cardPadding || result.tokens.layout.cardPadding,
            elementGap: elementGap || result.tokens.layout.elementGap,
            maxContentWidth:
              maxContentWidth || result.tokens.layout.maxContentWidth,
          }
        }
      }
      continue
    }

    if (isDosDontsTitle(title)) {
      result.rawSections.dosDonts = parseDosDonts(section.tokens)
      continue
    }

    if (title.includes("imagery") || title.includes("image")) {
      result.rawSections.imagery = findParagraphs(section.tokens)
      continue
    }
  }

  result.previewSemantics = buildPreviewSemantics(result.tokens)

  return result
}
