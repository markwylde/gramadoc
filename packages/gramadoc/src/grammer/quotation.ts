type QuoteKind = 'single' | 'double'

export interface QuotePair {
  kind: QuoteKind
  open: number
  close: number
}

function isWordCharacter(value: string | undefined) {
  return value !== undefined && /[\p{L}\p{M}\p{N}]/u.test(value)
}

function getVisibleNeighbor(text: string, index: number, direction: -1 | 1) {
  let cursor = index + direction

  while (cursor >= 0 && cursor < text.length) {
    const value = text[cursor]

    if (!/\s/u.test(value ?? '')) {
      return value
    }

    cursor += direction
  }

  return undefined
}

function getAsciiQuoteKind(text: string, index: number, quote: '"' | "'") {
  const previous = text[index - 1]
  const next = text[index + 1]
  const previousVisible = getVisibleNeighbor(text, index, -1)
  const nextVisible = getVisibleNeighbor(text, index, 1)

  if (quote === "'" && isWordCharacter(previous) && isWordCharacter(next)) {
    return null
  }

  const previousLooksLikeOpenBoundary =
    previous === undefined || /[\s([{-]/u.test(previous)
  const nextLooksLikeCloseBoundary =
    next === undefined || /[\s.,!?;:)\]}]/u.test(next)
  const looksLikeOpen =
    previousLooksLikeOpenBoundary &&
    (isWordCharacter(next) ||
      (/\s/u.test(next ?? '') && isWordCharacter(nextVisible)) ||
      /["'([{]/u.test(nextVisible ?? ''))
  const looksLikeClose =
    (isWordCharacter(previous) ||
      (/\s/u.test(previous ?? '') && isWordCharacter(previousVisible))) &&
    (nextLooksLikeCloseBoundary ||
      !isWordCharacter(nextVisible) ||
      /[.,!?;:)\]}]/u.test(nextVisible ?? ''))

  if (looksLikeOpen && !looksLikeClose) {
    return 'open' as const
  }

  if (looksLikeClose && !looksLikeOpen) {
    return 'close' as const
  }

  return null
}

export function analyzeQuotationMarks(text: string) {
  const pairs: QuotePair[] = []
  const unmatchedOpenings: Array<{ kind: QuoteKind; offset: number }> = []
  const unmatchedClosings: Array<{ kind: QuoteKind; offset: number }> = []
  const stacks: Record<QuoteKind, number[]> = {
    single: [],
    double: [],
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (!`"'“”‘’`.includes(character)) {
      continue
    }

    if (character === '“') {
      stacks.double.push(index)
      continue
    }

    if (character === '”') {
      const open = stacks.double.pop()

      if (open === undefined) {
        unmatchedClosings.push({ kind: 'double', offset: index })
      } else {
        pairs.push({ kind: 'double', open, close: index })
      }
      continue
    }

    if (character === '‘') {
      stacks.single.push(index)
      continue
    }

    if (character === '’') {
      if (
        isWordCharacter(text[index - 1]) &&
        isWordCharacter(text[index + 1])
      ) {
        continue
      }

      const open = stacks.single.pop()

      if (open === undefined) {
        unmatchedClosings.push({ kind: 'single', offset: index })
      } else {
        pairs.push({ kind: 'single', open, close: index })
      }
      continue
    }

    const kind = character === '"' ? 'double' : 'single'

    if (
      character === "'" &&
      isWordCharacter(text[index - 1]) &&
      isWordCharacter(text[index + 1])
    ) {
      continue
    }

    const asciiQuoteKind = getAsciiQuoteKind(
      text,
      index,
      character as '"' | "'",
    )
    const inferredKind =
      asciiQuoteKind ??
      (stacks[kind].length === 0 ? ('open' as const) : ('close' as const))

    if (inferredKind === 'open') {
      stacks[kind].push(index)
      continue
    }

    const open = stacks[kind].pop()

    if (open === undefined) {
      unmatchedClosings.push({ kind, offset: index })
    } else {
      pairs.push({ kind, open, close: index })
    }
  }

  for (const [kind, offsets] of Object.entries(stacks) as Array<
    [QuoteKind, number[]]
  >) {
    for (const offset of offsets) {
      unmatchedOpenings.push({ kind, offset })
    }
  }

  return { pairs, unmatchedOpenings, unmatchedClosings }
}
