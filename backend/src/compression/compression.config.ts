export const CompressionConfig = {
  /** Max total characters across all non-compressed messages before compression triggers */
  MAX_CONTEXT_CHARS: 120_000,

  /** Number of most recent messages to always keep uncompressed */
  KEEP_RECENT_MESSAGES: 6,

  /** Min chars per message to consider it worth compressing */
  MIN_MESSAGE_CHARS: 80,

  /** Max length of the generated summary */
  MAX_SUMMARY_CHARS: 10_000,

  /** Patterns that identify critical content to preserve */
  PRESERVE_PATTERNS: [
    /\b[A-Z]{2,}[-/][A-Z0-9]+\b/,           // equipment tags: GT-1, HRSG-01A, FCV-1234
    /\b\d{4,}\b/,                              // 4+ digit numbers (likely IDs, pressures, temps)
    /\b(?:GT|HRSG|ST|GEN|BOP|DCS|PLC|MCC|HVAC|CEMS|SCADA)\b/,
    /(?:risk|safe|hazard|fail|warn|cau?tion|critical|emergency)/i,
    /(?:recommend|require|mandatory|must|shall|verify|confirm)/i,
    /Attachment:|Figure|Table|Section|Appendix/i,
    /(?:PDF|DOCX|XLSX|CSV)\s*:?\s*['\u2018-\u2019"]?\w+['\u2018-\u2019"]?/i,
    /(?:commission|startup|shut\s?down|trip|alarm|protective\s*relay|over-speed|over-temp)/i,
  ],

  /** Patterns for content that can be safely removed */
  STRIP_PATTERNS: [
    /^(?:Sure|Okay|Alright|Yes|No|Absolutely|Certainly|Of course)[\s,].{0,80}$/im,
    /^(?:Based on|From|As a|In this|Let me|I can|I'll|I'd|I've|Note that|Please note|Keep in mind)/im,
    /^> /gm,
    /_{3,}/g,
    /-{3,}/g,
  ],
}
