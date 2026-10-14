const CUSTOM_PROPERTY_PATTERN = /^--[a-z_][a-z0-9_-]*$/i
const PLACEHOLDER_PATTERN =
  /(?:^|\b)(?:unknown|unknow|undefined|null|n\/?a|tbd|todo)(?:\b|$)|^\s*[?\-–—]+\s*$/i
const DUAL_UNIT_PATTERN =
  /-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|vh|vw|vi|vb|vmin|vmax|%|ch|ex)\s*\(\s*-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|vh|vw|vi|vb|vmin|vmax|%|ch|ex)\s*\)/i
const DIMENSION_RANGE_PATTERN =
  /-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|vh|vw|vi|vb|vmin|vmax|%|ch|ex)\s*(?:to|[–—])\s*-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|vh|vw|vi|vb|vmin|vmax|%|ch|ex)/i
const UNICODE_NUMERIC_SIGN_PATTERN = /[–—−]\s*(?=\d|\.)/
const INCOMPLETE_VALUE_PATTERN = /…|\.\.\.|truncated\s+in\s+evidence/i
const INCOMPLETE_GRADIENT_ARGUMENT_PATTERN =
  /^\s*-?(?:\d+\.?\d*|\.\d+)(?:deg|turn|rad)\s*,/i
const PROVENANCE_SUFFIX_PATTERN =
  /\s*\((?:observed|known|assumed|inferred|estimated)\)\s*$/i
const CUSTOM_PROPERTY_REFERENCE_PATTERN = /var\(\s*(--[a-z_][a-z0-9_-]*)\b/gi

export function stripMarkdownCode(value        ) {
  return value.replace(/^`|`$/g, "").trim()
}

export function stripProvenance(value        ) {
  return stripMarkdownCode(value).replace(PROVENANCE_SUFFIX_PATTERN, "").trim()
}

export function isCanonicalCustomProperty(value        ) {
  return CUSTOM_PROPERTY_PATTERN.test(stripMarkdownCode(value))
}

export function getCustomPropertyReferences(value        ) {
  const references = new Set        ()
  for (const match of stripMarkdownCode(value).matchAll(
    CUSTOM_PROPERTY_REFERENCE_PATTERN
  )) {
    references.add(match[1].toLowerCase())
  }
  return [...references]
}

export function containsPlaceholderValue(value        ) {
  return PLACEHOLDER_PATTERN.test(stripMarkdownCode(value))
}

export function containsIncompleteValue(value        ) {
  return INCOMPLETE_VALUE_PATTERN.test(stripMarkdownCode(value))
}

export function hasInvalidTokenValue(value        ) {
  const raw = stripMarkdownCode(value)
  if (!raw) return false
  return (
    PLACEHOLDER_PATTERN.test(raw) ||
    PROVENANCE_SUFFIX_PATTERN.test(raw) ||
    DUAL_UNIT_PATTERN.test(raw) ||
    DIMENSION_RANGE_PATTERN.test(raw) ||
    UNICODE_NUMERIC_SIGN_PATTERN.test(raw) ||
    INCOMPLETE_VALUE_PATTERN.test(raw) ||
    INCOMPLETE_GRADIENT_ARGUMENT_PATTERN.test(raw)
  )
}

export function isExportableTokenValue(value        ) {
  return Boolean(stripMarkdownCode(value)) && !hasInvalidTokenValue(value)
}

export function isCompleteGradientValue(value        ) {
  return /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(
    stripMarkdownCode(value)
  )
}
