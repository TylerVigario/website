import { Column, Row, Section, Text } from "@react-email/components";
import { EmailFooter, EmailHeader, EmailLayout, colors } from "./components/layout";

export interface PotsAuditRequestEmailProps {
  business: string;
  name: string;
  contact: string;
  bill: string;
  details?: string;
  submittedAtFormatted: string;
}

/**
 * Internal notification when a /pots-migration audit form submission
 * lands. Distinct subject + footer copy from quote-request so the
 * inbox can sort by source at a glance.
 */
export function PotsAuditRequestEmail({
  business,
  name,
  contact,
  bill,
  details,
  submittedAtFormatted,
}: PotsAuditRequestEmailProps) {
  const previewText = `${business} · monthly bill ${bill}`;

  return (
    <EmailLayout preview={previewText}>
      <EmailHeader title="POTS Migration Audit Request" subtitle={submittedAtFormatted} />

      <Section style={contentWrapper}>
        <Section style={card}>
          <Field label="Business" value={business} />
          <Field label="Name" value={name} />
          <Field label="Contact" value={contact} />
          <Field label="Monthly bill" value={bill} />
          <Field label="Details" value={details || "(none)"} multiline />
        </Section>
      </Section>

      <EmailFooter context="Sent from /pots-migration landing page." />
    </EmailLayout>
  );
}

interface FieldProps {
  label: string;
  value: string;
  multiline?: boolean;
}

function Field({ label, value, multiline }: FieldProps) {
  return (
    <Row style={fieldRow}>
      <Column style={fieldLabelColumn}>
        <Text style={fieldLabel}>{label}</Text>
      </Column>
      <Column style={fieldValueColumn}>
        <Text style={multiline ? fieldValueMultiline : fieldValue}>{value}</Text>
      </Column>
    </Row>
  );
}

// ============================================================
// Styles (kept in-sync with quote-request.tsx for visual parity)
// ============================================================

const contentWrapper = {
  backgroundColor: colors.background,
  padding: "16px",
};

const card = {
  backgroundColor: colors.surfaceLight,
  borderRadius: "6px",
  padding: "8px 18px",
  border: `1px solid ${colors.border}`,
};

const fieldRow = {
  borderBottom: `1px solid ${colors.background}`,
  padding: "10px 0",
};

const fieldLabelColumn = {
  width: "30%",
  verticalAlign: "top" as const,
};

const fieldValueColumn = {
  width: "70%",
  verticalAlign: "top" as const,
};

const fieldLabel = {
  margin: "0",
  fontSize: "12px",
  fontWeight: "600" as const,
  color: colors.muted,
  textTransform: "uppercase" as const,
  letterSpacing: "0.4px",
};

const fieldValue = {
  margin: "0",
  fontSize: "14px",
  color: colors.foreground,
};

const fieldValueMultiline = {
  ...fieldValue,
  whiteSpace: "pre-wrap" as const,
  lineHeight: "1.5",
};

// ============================================================
// Preview (for `npm run email:dev`)
// ============================================================

export default function PotsAuditRequestPreview() {
  return (
    <PotsAuditRequestEmail
      business="Acme Co."
      name="Pat Owner"
      contact="pat@acmeco.com or (559) 555-9876"
      bill="$500–$1,000"
      details={
        "AT&T just sent a Business Service Agreement we didn't sign. They're claiming a 1-year" +
        " contract with a $4k ETF. We want to port out and dispute the BSA."
      }
      submittedAtFormatted="Sat, May 10, 2026 at 10:14 AM PDT"
    />
  );
}
