import { describe, expect, it } from 'vitest'
import { runRule } from '../../testUtils'
import {
  invalidEmailFormatRule,
  malformedUrlProtocolRule,
  missingUrlProtocolRule,
} from './rule'

describe('invalidEmailFormatRule', () => {
  it('flags malformed email addresses', () => {
    const matches = runRule(
      invalidEmailFormatRule,
      'Contact support@example or jane..doe@example.com today.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This email address looks malformed.',
      replacements: [],
    })
    expect(matches[1]).toMatchObject({
      message: 'This email address looks malformed.',
    })
  })

  it('flags email addresses with multiple at-signs', () => {
    const matches = runRule(
      invalidEmailFormatRule,
      'Send it to support@@example.com right away.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'This email address contains too many "@" symbols.',
      replacements: [{ value: 'support@example.com' }],
    })
  })

  it('does not flag valid emails including plus tags and multi-part domains', () => {
    expect(
      runRule(
        invalidEmailFormatRule,
        'Email jane.doe+alerts@example.co.uk or support@example.com.',
      ),
    ).toEqual([])
  })
})

describe('missingUrlProtocolRule', () => {
  it('flags bare www links and suggests https', () => {
    const matches = runRule(
      missingUrlProtocolRule,
      'Visit www.example.com/docs for the guide.',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      message: 'Add a protocol to this URL.',
      replacements: [{ value: 'https://www.example.com/docs' }],
    })
  })

  it('does not flag URLs that already include a protocol', () => {
    expect(
      runRule(
        missingUrlProtocolRule,
        'Visit https://www.example.com or http://example.org today.',
      ),
    ).toEqual([])
  })
})

describe('malformedUrlProtocolRule', () => {
  it('flags URLs with malformed protocol prefixes', () => {
    const matches = runRule(
      malformedUrlProtocolRule,
      'Open https:/example.com and http//example.org next.',
    )

    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      message: 'This URL protocol looks malformed.',
      replacements: [{ value: 'https://example.com' }],
    })
    expect(matches[1]).toMatchObject({
      replacements: [{ value: 'http://example.org' }],
    })
  })

  it('does not flag correctly formed URLs or trailing sentence punctuation', () => {
    expect(
      runRule(
        malformedUrlProtocolRule,
        'Open https://example.com/docs. Then try http://example.org.',
      ),
    ).toEqual([])
  })
})
