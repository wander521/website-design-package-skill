
import {
  getCustomPropertyReferences,
  isCanonicalCustomProperty,
  isCompleteGradientValue,
  isExportableTokenValue,
} from "./token-syntax.mjs"

















function buildTokenDefinitions(tokens              ) {
  const definitions = new Map                ()
  const add = (token        , value        ) => {
    if (isCanonicalCustomProperty(token)) {
      definitions.set(token.trim().toLowerCase(), value)
    }
  }

  for (const token of tokens.colors) add(token.token, token.value)
  for (const token of tokens.gradients) add(token.token, token.value)
  for (const font of tokens.typography.fontFamilies) {
    add(font.token, font.substitute || font.name)
  }
  for (const token of tokens.typography.typeScale) add(token.token, token.size)
  for (const token of tokens.spacing) add(token.token, token.value)
  for (const token of tokens.radius) add(token.token, token.value)
  for (const token of tokens.shadows) add(token.token, token.value)

  return definitions
}

function referenceResolves(
  reference        ,
  definitions                     ,
  visiting = new Set        ()
)          {
  const normalized = reference.toLowerCase()
  const value = definitions.get(normalized)
  if (value === undefined || visiting.has(normalized)) return false

  const nextReferences = getCustomPropertyReferences(value)
  if (nextReferences.length === 0) return true

  const nextVisiting = new Set(visiting)
  nextVisiting.add(normalized)
  return nextReferences.every((next) =>
    referenceResolves(next, definitions, nextVisiting)
  )
}

function tokenIssue(token        , path        )                          {
  if (!token.trim()) return { code: "missing-token", path, value: token }
  if (!isCanonicalCustomProperty(token)) {
    return { code: "invalid-token", path, value: token }
  }
  return null
}

export function getTokenExportReadiness(
  tokens
)                       {
  const issues                     = []
  const definitions = buildTokenDefinitions(tokens)
  const tokenCount =
    tokens.colors.length +
    tokens.gradients.length +
    tokens.typography.fontFamilies.length +
    tokens.typography.typeScale.length +
    tokens.spacing.length +
    tokens.radius.length +
    tokens.shadows.length
  if (tokenCount === 0) {
    issues.push({ code: "missing-token", path: "tokens", value: "" })
  }
  const checkValue = (value        , path        ) => {
    if (!isExportableTokenValue(value)) {
      issues.push({ code: "invalid-value", path, value })
      return false
    }
    if (
      getCustomPropertyReferences(value).some(
        (reference) => !referenceResolves(reference, definitions)
      )
    ) {
      issues.push({ code: "unresolved-reference", path, value })
      return false
    }
    return true
  }
  const checkToken = (value        , path        ) => {
    const issue = tokenIssue(value, path)
    if (issue) issues.push(issue)
  }

  for (const [index, token] of tokens.colors.entries()) {
    checkToken(token.token, `colors.${index}.token`)
    checkValue(token.value, `colors.${index}.value`)
  }
  for (const [index, token] of tokens.gradients.entries()) {
    checkToken(token.token, `gradients.${index}.token`)
    const valueIsExportable = checkValue(
      token.value,
      `gradients.${index}.value`
    )
    if (
      valueIsExportable &&
      token.value.trim() &&
      !isCompleteGradientValue(token.value)
    ) {
      issues.push({
        code: "invalid-value",
        path: `gradients.${index}.value`,
        value: token.value,
      })
    }
  }
  for (const [index, font] of tokens.typography.fontFamilies.entries()) {
    checkToken(font.token, `typography.fontFamilies.${index}.token`)
    checkValue(
      font.substitute || font.name,
      `typography.fontFamilies.${index}.substitute`
    )
  }
  for (const [index, token] of tokens.typography.typeScale.entries()) {
    checkToken(token.token, `typography.typeScale.${index}.token`)
    checkValue(token.size, `typography.typeScale.${index}.size`)
    checkValue(token.lineHeight, `typography.typeScale.${index}.lineHeight`)
    if (token.letterSpacing) {
      checkValue(
        token.letterSpacing,
        `typography.typeScale.${index}.letterSpacing`
      )
    }
  }
  for (const [group, entries] of [
    ["spacing", tokens.spacing],
    ["radius", tokens.radius],
    ["shadows", tokens.shadows],
  ]         ) {
    for (const [index, token] of entries.entries()) {
      checkToken(token.token, `${group}.${index}.token`)
      checkValue(token.value, `${group}.${index}.value`)
    }
  }
  for (const [key, value] of Object.entries(tokens.layout)) {
    if (value) checkValue(value, `layout.${key}`)
  }

  return { ready: issues.length === 0, issueCount: issues.length, issues }
}
