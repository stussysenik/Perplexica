/**
 * Unit tests for the SSE parser — verifies spec-compliant parsing of
 * all SSE field types, edge cases, and error conditions.
 */

import { describe, it, expect } from 'vitest'
import { parseSseBuffer, serializeSseEvent, serializeJsonSseEvent } from '../sse-parser'
import type { ParsedSseEvent } from '../sse-parser'

function parse(buffer: string): readonly [ParsedSseEvent[], string] {
  return parseSseBuffer(buffer)
}

describe('parseSseBuffer', () => {
  // ── Basic parsing ──────────────────────────────────────────────

  it('parses a single event with data', () => {
    const [events, remaining] = parse('data: hello\n\n')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ event: 'message', data: 'hello', id: null, retry: null })
    expect(remaining).toBe('')
  })

  it('parses multiple events', () => {
    const [events, remaining] = parse('data: first\n\ndata: second\n\n')
    expect(events).toHaveLength(2)
    expect(events[0].data).toBe('first')
    expect(events[1].data).toBe('second')
    expect(remaining).toBe('')
  })

  it('defaults event type to "message" when no event field', () => {
    const [events] = parse('data: hello\n\n')
    expect(events[0].event).toBe('message')
  })

  // ── event: field ───────────────────────────────────────────────

  it('parses custom event type', () => {
    const [events] = parse('event: block\ndata: {"type":"text"}\n\n')
    expect(events[0].event).toBe('block')
    expect(events[0].data).toBe('{"type":"text"}')
  })

  // ── id: field ─────────────────────────────────────────────────

  it('parses event id', () => {
    const [events] = parse('id: 42\ndata: hello\n\n')
    expect(events[0].id).toBe('42')
  })

  it('handles null id', () => {
    const [events] = parse('data: hello\n\n')
    expect(events[0].id).toBeNull()
  })

  // ── retry: field ──────────────────────────────────────────────

  it('parses retry field', () => {
    const [events] = parse('retry: 5000\ndata: hello\n\n')
    expect(events[0].retry).toBe(5000)
  })

  it('handles null retry', () => {
    const [events] = parse('data: hello\n\n')
    expect(events[0].retry).toBeNull()
  })

  it('treats invalid retry values as null', () => {
    const [events] = parse('retry: abc\ndata: hello\n\n')
    expect(events[0].retry).toBeNull()
  })

  // ── Multi-line data ───────────────────────────────────────────

  it('joins multi-line data fields with newlines', () => {
    const [events] = parse('data: line1\ndata: line2\ndata: line3\n\n')
    expect(events[0].data).toBe('line1\nline2\nline3')
  })

  it('handles mixed fields (event + multi-line data + id)', () => {
    const [events] = parse('event: update\ndata: {"a":1}\ndata: {"b":2}\nid: 99\n\n')
    expect(events[0].event).toBe('update')
    expect(events[0].data).toBe('{"a":1}\n{"b":2}')
    expect(events[0].id).toBe('99')
  })

  // ── Comments ─────────────────────────────────────────────────

  it('ignores comment lines (starting with colon)', () => {
    const [events] = parse(': this is a comment\ndata: real\n\n')
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('real')
  })

  it('ignores comment-only events (colon with no data)', () => {
    const [events] = parse(': ping\n\n')
    expect(events).toHaveLength(0)
  })

  // ── Edge cases ────────────────────────────────────────────────

  it('handles empty input', () => {
    const [events, remaining] = parse('')
    expect(events).toHaveLength(0)
    expect(remaining).toBe('')
  })

  it('handles only whitespace', () => {
    const [events] = parse('   \n\n')
    expect(events).toHaveLength(0)
  })

  it('handles field with leading space after colon (per spec)', () => {
    const [events] = parse('data: value with leading space removed\n\n')
    // Spec: if value starts with U+0020 SPACE, remove it
    expect(events[0].data).toBe('value with leading space removed')
  })

  it('handles field with no colon (field name only)', () => {
    const [events] = parse('data\n\n')
    // Field with no colon: treated as field name with empty value
    expect(events[0].data).toBe('')
  })

  it('handles unknown fields (ignores them)', () => {
    const [events] = parse('custom: ignored\ndata: real\n\n')
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('real')
  })

  // ── Partial/incomplete events ─────────────────────────────────

  it('returns incomplete line as remaining buffer', () => {
    const [events, remaining] = parse('data: hello\n\ndata: incomplete')
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('hello')
    expect(remaining).toBe('data: incomplete')
  })

  it('handles chunked event arrival (simulated two-chunk parse)', () => {
    // First chunk: partial event (no \n\n terminator yet)
    const [events1, rem1] = parse('data: line1\n')
    expect(events1).toHaveLength(0)
    expect(rem1).toBe('data: line1\n')

    // Second chunk: completes the multi-line data event
    const [events2, rem2] = parse(rem1 + 'data: line2\n\n')
    expect(events2).toHaveLength(1)
    expect(events2[0].data).toBe('line1\nline2')
    expect(rem2).toBe('')
  })

  it('handles buffer ending with newline (no remaining)', () => {
    const [events, remaining] = parse('data: hello\n\n')
    expect(events).toHaveLength(1)
    expect(remaining).toBe('')
  })

  // ── BOM handling ─────────────────────────────────────────────

  it('handles data containing JSON', () => {
    const json = JSON.stringify({ type: 'block', block: { text: 'hello' } })
    const [events] = parse(`data: ${json}\n\n`)
    expect(events[0].data).toBe(json)
    expect(() => JSON.parse(events[0].data)).not.toThrow()
  })

  // ── [DONE] sentinel (OpenAI-compatible) ──────────────────────

  it('passes through [DONE] sentinel as regular data', () => {
    const [events] = parse('data: [DONE]\n\n')
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('[DONE]')
  })
})

describe('serializeSseEvent', () => {
  it('serializes a basic event', () => {
    const serialized = serializeSseEvent({
      event: 'message',
      data: 'hello',
      id: null,
      retry: null,
    })
    expect(serialized).toBe('data: hello\n\n')
  })

  it('serializes event with all fields', () => {
    const serialized = serializeSseEvent({
      event: 'block',
      data: '{"type":"text"}',
      id: '42',
      retry: 5000,
    })
    expect(serialized).toBe('id: 42\nevent: block\nretry: 5000\ndata: {"type":"text"}\n\n')
  })

  it('serializes multi-line data', () => {
    const serialized = serializeSseEvent({
      event: 'message',
      data: 'line1\nline2',
      id: null,
      retry: null,
    })
    expect(serialized).toBe('data: line1\ndata: line2\n\n')
  })

  it('round-trips through parse and serialize', () => {
    const original: ParsedSseEvent = {
      event: 'block',
      data: '{"type":"text"}',
      id: '42',
      retry: 5000,
    }
    const serialized = serializeSseEvent(original)
    const [parsed] = parse(serialized)
    expect(parsed[0]).toEqual(original)
  })
})

describe('serializeJsonSseEvent', () => {
  it('serializes a JSON payload as SSE', () => {
    const sse = serializeJsonSseEvent('block', { type: 'text', data: 'hello' }, { id: '1', retry: 5000 })
    expect(sse).toContain('event: block')
    expect(sse).toContain('data: {"type":"text","data":"hello"}')
    expect(sse).toContain('id: 1')
    expect(sse).toContain('retry: 5000')
  })
})
