import { describe, expect, it } from "vitest";
import { MAX, tooLong } from "@/lib/forms/limits";
import { QuoteRequest } from "@/lib/api/quote";
import { BILL_RANGES, PotsAuditRequest } from "@/lib/api/pots-audit";
import { services as catalog } from "@/lib/services";

/**
 * A single-line field keeps to one line: every run of control
 * characters in a name, business or contact is stored and emailed as one
 * space (src/lib/api/one-line.ts). Before it, the trim; after it, the
 * length. `details` keeps its line breaks, and Unicode's format
 * characters pass untouched in every field.
 *
 * Each character is built from its code point, so this file holds none
 * of them and reads the same in any editor.
 */

const cp = (...points: number[]) => String.fromCodePoint(...points);

const NUL = cp(0x00);
const TAB = cp(0x09);
const LF = cp(0x0a);
const CR = cp(0x0d);
const ESC = cp(0x1b);
const DEL = cp(0x7f);
const NEL = cp(0x85); // C1: a line break in some encodings
const LS = cp(0x2028); // line separator
const PS = cp(0x2029); // paragraph separator
const RLO = cp(0x202e); // right-to-left override, a format character
const ZWJ = cp(0x200d); // zero-width joiner, a format character

const service = catalog[0]?.title;
if (!service) throw new Error("this test needs a service in the catalog");
const bill = BILL_RANGES[0];

const forms = [
  {
    form: "quote",
    schema: QuoteRequest,
    base: { name: "Ann", contact: "ann@example.com", services: [service] },
    required: {
      name: "Please enter your name.",
      contact: "Please enter a phone number or email.",
    },
  },
  {
    form: "pots-audit",
    schema: PotsAuditRequest,
    base: { business: "Shop", name: "Ann", contact: "ann@example.com", bill },
    required: {
      business: "Please enter the business name.",
      name: "Please enter your name.",
      contact: "Please enter a phone number or email.",
    },
  },
] as const;

const cases = forms.flatMap(({ form, schema, base, required }) =>
  Object.entries(required).map(([field, message]) => ({ form, schema, base, field, message })),
);

describe.each(cases)("$form $field", ({ schema, base, field, message }) => {
  const parse = (value: string) => schema.safeParse({ ...base, [field]: value });
  const kept = (value: string) => {
    const result = parse(value);
    if (!result.success) throw new Error(`refused: ${JSON.stringify(result.error.issues)}`);
    return (result.data as Record<string, unknown>)[field];
  };

  it("makes each control character a space", () => {
    for (const c of [NUL, TAB, LF, CR, ESC, DEL, NEL, LS, PS]) {
      expect(kept(`a${c}b`)).toBe("a b");
    }
  });

  it("makes a run of them one space", () => {
    expect(kept(`a${CR}${LF}${TAB}${NUL}b`)).toBe("a b");
  });

  it("trims after, so control characters at either end are gone", () => {
    expect(kept(`${LF}${TAB}a b${CR}${NUL}`)).toBe("a b");
  });

  it("asks for a value when there is nothing else", () => {
    const result = parse(`${NUL}${TAB}${LF}`);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([message]);
  });

  it("leaves format characters alone", () => {
    expect(kept(`a${RLO}b${ZWJ}c`)).toBe(`a${RLO}b${ZWJ}c`);
  });

  it("measures the length after", () => {
    const max = MAX[field as keyof typeof MAX];
    const half = "x".repeat(Math.floor((max - 1) / 2));
    const rest = "x".repeat(max - 1 - half.length);
    // max characters once the run is one space, far more before it
    expect(kept(`${half}${NUL.repeat(50)}${rest}`)).toHaveLength(max);
    const over = parse(`${half}${NUL.repeat(50)}${rest}x`);
    expect(over.success).toBe(false);
    expect(over.error?.issues.map((i) => i.message)).toEqual([tooLong(max)]);
  });
});

describe("details", () => {
  it("keeps its line breaks and tabs", () => {
    const details = `line one${LF}${TAB}line two${CR}${LF}line three`;
    const result = QuoteRequest.safeParse({
      name: "Ann",
      contact: "ann@example.com",
      services: [service],
      details,
    });
    expect(result.success && result.data.details).toBe(details);
  });
});
