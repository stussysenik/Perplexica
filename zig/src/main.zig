const std = @import("std");

// Perplexica HTML Parser — Stretch Goal
// This will be a high-performance HTML-to-text extraction server.
// Only implement after benchmarking Phoenix's Floki library.
//
// Planned: POST /parse — accepts HTML body, returns extracted text as JSON.

pub fn main() void {
    const msg = "Perplexica HTML Parser (placeholder)\nThis service is a stretch goal. Benchmark Floki first.\n";
    _ = std.posix.write(std.posix.STDOUT_FILENO, msg) catch {};
}
