import { describe, expect, it } from 'vitest'
import { houseStyleTerms } from './house-style.js'
import { lexicalConsistencyGroups } from './lexical-consistency.js'
import {
  plainEnglishSuggestionPatterns,
  redundancyPhrasePatterns,
  replacementPhrasePatterns,
} from './wordiness.js'

describe('lexical pack snapshots', () => {
  it('keeps house-style and lexical consistency packs stable', () => {
    expect(
      houseStyleTerms.map((entry) => ({
        phrase: entry.phrase,
        preferred: entry.preferred,
        kind: entry.kind,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "kind": "product-name",
          "phrase": "github actions",
          "preferred": "GitHub Actions",
        },
        {
          "kind": "product-name",
          "phrase": "visual studio code",
          "preferred": "Visual Studio Code",
        },
        {
          "kind": "legacy-name",
          "phrase": "g suite",
          "preferred": "Google Workspace",
        },
        {
          "kind": "legacy-name",
          "phrase": "google data studio",
          "preferred": "Looker Studio",
        },
        {
          "kind": "preferred-brand-casing",
          "phrase": "github",
          "preferred": "GitHub",
        },
        {
          "kind": "preferred-brand-casing",
          "phrase": "javascript",
          "preferred": "JavaScript",
        },
        {
          "kind": "preferred-brand-casing",
          "phrase": "openai",
          "preferred": "OpenAI",
        },
        {
          "kind": "preferred-brand-casing",
          "phrase": "typescript",
          "preferred": "TypeScript",
        },
        {
          "kind": "special-numeral-format",
          "phrase": "ipv4",
          "preferred": "IPv4",
        },
        {
          "kind": "special-numeral-format",
          "phrase": "ipv6",
          "preferred": "IPv6",
        },
      ]
    `)

    expect(
      lexicalConsistencyGroups.map((group) => ({
        id: group.id,
        preferred: group.preferred,
        variants: group.variants,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "EMAIL_STYLE",
          "preferred": "email",
          "variants": [
            "email",
            "e-mail",
          ],
        },
        {
          "id": "WEBSITE_STYLE",
          "preferred": "website",
          "variants": [
            "website",
            "web site",
            "web-site",
          ],
        },
        {
          "id": "COWORKER_STYLE",
          "preferred": "coworker",
          "variants": [
            "coworker",
            "co-worker",
          ],
        },
      ]
    `)
  })

  it('keeps the main wordiness packs stable', () => {
    expect(
      replacementPhrasePatterns.map((entry) => entry.phrase),
    ).toMatchInlineSnapshot(`
      [
        "for the purpose of",
        "in the event that",
        "in order to",
        "due to the fact that",
        "at this point in time",
        "make use of",
        "prior to",
        "has the ability to",
        "for the reason that",
        "for the most part",
        "in spite of the fact that",
        "on a daily basis",
        "until such time as",
        "with the exception of",
        "for the duration of",
        "in the near future",
      ]
    `)

    expect(
      redundancyPhrasePatterns.map((entry) => entry.phrase),
    ).toMatchInlineSnapshot(`
      [
        "basic fundamentals",
        "future plans",
        "past history",
        "each and every",
        "sufficient enough",
        "ask the question",
        "as of yet",
        "repeat again",
        "free gift",
        "very unique",
        "end result",
        "merge together",
        "close proximity",
        "advance planning",
        "final outcome",
        "final conclusion",
        "return back",
        "combine together",
        "collaborate together",
        "personal opinion",
        "true facts",
        "added bonus",
        "still remains",
      ]
    `)

    expect(
      plainEnglishSuggestionPatterns.map((entry) => ({
        phrase: entry.phrase,
        replacements: entry.replacements ?? [],
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "phrase": "at your earliest convenience",
          "replacements": [
            "soon",
            "when you can",
          ],
        },
        {
          "phrase": "in terms of",
          "replacements": [
            "for",
            "about",
          ],
        },
        {
          "phrase": "please be advised",
          "replacements": [
            "please note",
            "note that",
          ],
        },
        {
          "phrase": "for your information",
          "replacements": [
            "for reference",
            "note that",
          ],
        },
        {
          "phrase": "please do not hesitate to",
          "replacements": [
            "please",
            "feel free to",
          ],
        },
        {
          "phrase": "with respect to",
          "replacements": [
            "for",
            "about",
          ],
        },
        {
          "phrase": "in connection with",
          "replacements": [
            "for",
            "about",
          ],
        },
        {
          "phrase": "going forward",
          "replacements": [
            "from now on",
            "in future",
          ],
        },
        {
          "phrase": "at this time",
          "replacements": [
            "now",
            "currently",
          ],
        },
        {
          "phrase": "in order for",
          "replacements": [
            "for",
          ],
        },
      ]
    `)
  })
})
