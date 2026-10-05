import { describe, expect, it } from "vitest";
import { renderPotsAuditEmail, renderQuoteEmail } from "@/emails/templates";

/**
 * The notification bodies interpolate what a stranger typed into HTML
 * that opens in the operator's own mail client. Every field is fed the
 * same hostile string, and none of it may arrive as markup.
 */
const HOSTILE = `<img src=x onerror="alert('x')">&`;
const ESCAPED = "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;";

describe("notification templates", () => {
  it("escape every field of a quote", () => {
    const html = renderQuoteEmail({
      name: HOSTILE,
      contact: HOSTILE,
      services: [HOSTILE, HOSTILE],
      details: `${HOSTILE}\n\n${HOSTILE}`,
      submittedAtFormatted: HOSTILE,
    });
    expect(html).not.toContain("<img");
    expect(html.split(ESCAPED).length - 1).toBe(7);
  });

  it("escape every field of a POTS audit", () => {
    const html = renderPotsAuditEmail({
      business: HOSTILE,
      name: HOSTILE,
      contact: HOSTILE,
      bill: HOSTILE,
      details: HOSTILE,
      submittedAtFormatted: HOSTILE,
    });
    expect(html).not.toContain("<img");
    expect(html.split(ESCAPED).length - 1).toBe(6);
  });

  it("keep the line breaks someone typed, and nothing else of theirs", () => {
    const html = renderQuoteEmail({
      name: "Dana",
      contact: "x",
      services: [],
      details: "one\ntwo\n\nthree",
      submittedAtFormatted: "now",
    });
    expect(html).toContain("one<br>two</p>");
    expect(html).toContain(">three</p>");
  });
});
