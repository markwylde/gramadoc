import { describe, expect, it } from 'vitest'
import { houseStyleTerms } from './resources/house-style'
import { lexicalConsistencyGroups } from './resources/lexical-consistency'
import {
  safeAutofixPhraseSimpleReplacePatterns,
  safeAutofixSingleWordSimpleReplacePatterns,
  suggestionOnlyPhraseSimpleReplacePatterns,
  suggestionOnlySingleWordSimpleReplacePatterns,
} from './resources/simple-replace'
import { variantPairs } from './resources/variant-mappings'
import {
  plainEnglishSuggestionPatterns,
  redundancyPhrasePatterns,
  replacementPhrasePatterns,
} from './resources/wordiness'

describe('lexical pack snapshots', () => {
  it('keeps curated lexical pack inventories stable as the rule surface grows', () => {
    expect({
      houseStyleTerms: houseStyleTerms.map((term) => ({
        phrase: term.phrase,
        preferred: term.preferred,
        kind: term.kind,
      })),
      lexicalConsistencyGroups: lexicalConsistencyGroups.map((group) => ({
        id: group.id,
        preferred: group.preferred,
        variants: group.variants,
      })),
      plainEnglishSuggestions: plainEnglishSuggestionPatterns.map(
        (pattern) => ({
          phrase: pattern.phrase,
          replacements: pattern.replacements ?? [],
        }),
      ),
      redundancyPhrases: redundancyPhrasePatterns.map((pattern) => ({
        phrase: pattern.phrase,
        replacements: pattern.replacements ?? [],
      })),
      safeAutofixPhrasePatterns: safeAutofixPhraseSimpleReplacePatterns.map(
        (pattern) => ({
          phrase: pattern.phrase,
          replacement: pattern.replacement,
        }),
      ),
      safeAutofixSingleWordPatterns:
        safeAutofixSingleWordSimpleReplacePatterns.map((pattern) => ({
          word: pattern.word,
          replacement: pattern.replacement,
        })),
      suggestionOnlyPhrasePatterns:
        suggestionOnlyPhraseSimpleReplacePatterns.map((pattern) => ({
          phrase: pattern.phrase,
          replacement: pattern.replacement,
        })),
      suggestionOnlySingleWordPatterns:
        suggestionOnlySingleWordSimpleReplacePatterns.map((pattern) => ({
          word: pattern.word,
          replacement: pattern.replacement,
        })),
      variantPairs: variantPairs,
      wordyReplacementPhrases: replacementPhrasePatterns.map((pattern) => ({
        phrase: pattern.phrase,
        replacements: pattern.replacements ?? [],
      })),
    }).toMatchInlineSnapshot(`
      {
        "houseStyleTerms": [
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
        ],
        "lexicalConsistencyGroups": [
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
        ],
        "plainEnglishSuggestions": [
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
        ],
        "redundancyPhrases": [
          {
            "phrase": "basic fundamentals",
            "replacements": [
              "fundamentals",
            ],
          },
          {
            "phrase": "future plans",
            "replacements": [
              "plans",
            ],
          },
          {
            "phrase": "past history",
            "replacements": [
              "history",
            ],
          },
          {
            "phrase": "each and every",
            "replacements": [
              "each",
            ],
          },
          {
            "phrase": "sufficient enough",
            "replacements": [
              "enough",
            ],
          },
          {
            "phrase": "ask the question",
            "replacements": [
              "ask",
            ],
          },
          {
            "phrase": "as of yet",
            "replacements": [
              "yet",
            ],
          },
          {
            "phrase": "repeat again",
            "replacements": [
              "repeat",
            ],
          },
          {
            "phrase": "free gift",
            "replacements": [],
          },
          {
            "phrase": "very unique",
            "replacements": [],
          },
          {
            "phrase": "end result",
            "replacements": [
              "result",
            ],
          },
          {
            "phrase": "merge together",
            "replacements": [
              "merge",
            ],
          },
          {
            "phrase": "close proximity",
            "replacements": [
              "proximity",
            ],
          },
          {
            "phrase": "advance planning",
            "replacements": [
              "planning",
            ],
          },
          {
            "phrase": "final outcome",
            "replacements": [
              "outcome",
            ],
          },
          {
            "phrase": "final conclusion",
            "replacements": [
              "conclusion",
            ],
          },
          {
            "phrase": "return back",
            "replacements": [
              "return",
            ],
          },
          {
            "phrase": "combine together",
            "replacements": [
              "combine",
            ],
          },
          {
            "phrase": "collaborate together",
            "replacements": [
              "collaborate",
            ],
          },
          {
            "phrase": "personal opinion",
            "replacements": [
              "opinion",
            ],
          },
          {
            "phrase": "true facts",
            "replacements": [
              "facts",
            ],
          },
          {
            "phrase": "added bonus",
            "replacements": [
              "bonus",
            ],
          },
          {
            "phrase": "still remains",
            "replacements": [
              "remains",
            ],
          },
        ],
        "safeAutofixPhrasePatterns": [
          {
            "phrase": "could of",
            "replacement": "could have",
          },
          {
            "phrase": "might of",
            "replacement": "might have",
          },
          {
            "phrase": "must of",
            "replacement": "must have",
          },
          {
            "phrase": "my be",
            "replacement": "maybe",
          },
          {
            "phrase": "should of",
            "replacement": "should have",
          },
          {
            "phrase": "there fore",
            "replacement": "therefore",
          },
          {
            "phrase": "would of",
            "replacement": "would have",
          },
          {
            "phrase": "your should",
            "replacement": "you should",
          },
        ],
        "safeAutofixSingleWordPatterns": [
          {
            "replacement": "a lot",
            "word": "alot",
          },
          {
            "replacement": "as well",
            "word": "aswell",
          },
          {
            "replacement": "at least",
            "word": "atleast",
          },
          {
            "replacement": "in case",
            "word": "incase",
          },
          {
            "replacement": "in fact",
            "word": "infact",
          },
        ],
        "suggestionOnlyPhrasePatterns": [
          {
            "phrase": "could care less",
            "replacement": "couldn’t care less",
          },
          {
            "phrase": "one in the same",
            "replacement": "one and the same",
          },
        ],
        "suggestionOnlySingleWordPatterns": [
          {
            "replacement": "regardless",
            "word": "irregardless",
          },
        ],
        "variantPairs": [
          {
            "uk": "analyse",
            "us": "analyze",
          },
          {
            "uk": "behaviour",
            "us": "behavior",
          },
          {
            "uk": "centre",
            "us": "center",
          },
          {
            "uk": "colour",
            "us": "color",
          },
          {
            "uk": "favourite",
            "us": "favorite",
          },
          {
            "uk": "honour",
            "us": "honor",
          },
          {
            "uk": "labour",
            "us": "labor",
          },
          {
            "uk": "organise",
            "us": "organize",
          },
          {
            "uk": "traveller",
            "us": "traveler",
          },
          {
            "uk": "travelled",
            "us": "traveled",
          },
        ],
        "wordyReplacementPhrases": [
          {
            "phrase": "for the purpose of",
            "replacements": [
              "to",
            ],
          },
          {
            "phrase": "in the event that",
            "replacements": [
              "if",
            ],
          },
          {
            "phrase": "in order to",
            "replacements": [
              "to",
            ],
          },
          {
            "phrase": "due to the fact that",
            "replacements": [
              "because",
            ],
          },
          {
            "phrase": "at this point in time",
            "replacements": [
              "now",
            ],
          },
          {
            "phrase": "make use of",
            "replacements": [
              "use",
            ],
          },
          {
            "phrase": "prior to",
            "replacements": [
              "before",
            ],
          },
          {
            "phrase": "has the ability to",
            "replacements": [
              "can",
            ],
          },
          {
            "phrase": "for the reason that",
            "replacements": [
              "because",
            ],
          },
          {
            "phrase": "for the most part",
            "replacements": [
              "mostly",
            ],
          },
          {
            "phrase": "in spite of the fact that",
            "replacements": [
              "although",
            ],
          },
          {
            "phrase": "on a daily basis",
            "replacements": [
              "daily",
            ],
          },
          {
            "phrase": "until such time as",
            "replacements": [
              "until",
            ],
          },
          {
            "phrase": "with the exception of",
            "replacements": [
              "except for",
            ],
          },
          {
            "phrase": "for the duration of",
            "replacements": [
              "during",
            ],
          },
          {
            "phrase": "in the near future",
            "replacements": [
              "soon",
            ],
          },
        ],
      }
    `)
  })
})
