import { Column, Row, Section, Text } from "@react-email/components";
import { EmailFooter, EmailHeader, EmailLayout, colors } from "./components/layout";

export interface QuoteRequestEmailProps {
  name: string;
  contact: string;
  services: string[];
  details?: string;
  submittedAtFormatted: string;
}

/** Internal notification when a /contact form submission lands. */
export function QuoteRequestEmail({
  name,
  contact,
  services,
  details,
  submittedAtFormatted,
}: QuoteRequestEmailProps) {
  const servicesStr = services.join(", ");
  const previewText = `${name} · ${servicesStr || "no services selected"}`;

  return (
    <EmailLayout preview={previewText}>
      <EmailHeader title="New Quote Request" subtitle={submittedAtFormatted} />

      <Section style={contentWrapper}>
        <Section style={card}>
          <Field label="Name" value={name} />
          <Field label="Contact" value={contact} />
          <Field label="Services" value={servicesStr || "(none selected)"} />
          <Field label="Details" value={details || "(none)"} multiline />
        </Section>
      </Section>

      <EmailFooter />
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
// Styles
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

export default function QuoteRequestPreview() {
  return (
    <QuoteRequestEmail
      name="Jane Smith"
      contact="jane@example.com or (559) 555-1234"
      services={["Networking", "Security Cameras"]}
      details={
        "We're opening a second location and need both the network and camera systems planned" +
        " out. Ideally we'd have a walkthrough this month — let me know your availability."
      }
      submittedAtFormatted="Sat, May 10, 2026 at 9:32 AM PDT"
    />
  );
}
