import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

// VTS brand palette — mirrors globals.css's @theme inline tokens.
// Email clients (especially Outlook) don't render CSS variables, so
// these are inlined as literal values everywhere.
export const colors = {
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  navy: "#1e2a4a",
  foreground: "#1c1917",
  muted: "#57534e",
  border: "#d6d3d1",
  background: "#fafaf9",
  surfaceLight: "#ffffff",
  white: "#ffffff",
};

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

/**
 * Outer shell every notification email reuses. Includes Outlook-
 * specific meta tags + a Segoe-UI-first font stack so the M365
 * preview pane renders close to other clients.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="x-apple-disable-message-reformatting" />
        <Font fontFamily="Segoe UI" fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]} />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>{children}</Container>
      </Body>
    </Html>
  );
}

interface EmailHeaderProps {
  title: string;
  subtitle?: string;
}

/** Brand-bar header. Accent background, white text. */
export function EmailHeader({ title, subtitle }: EmailHeaderProps) {
  return (
    <Section style={header}>
      <Text style={headerTitle}>{title}</Text>
      {subtitle && <Text style={headerSubtitle}>{subtitle}</Text>}
    </Section>
  );
}

interface EmailFooterProps {
  /** Optional context line — e.g. "Sent from /pots-migration." */
  context?: string;
}

export function EmailFooter({ context }: EmailFooterProps) {
  return (
    <Section style={footer}>
      <Link href="https://tylervigario.com" style={footerLink}>
        Vigario Technology Solutions
      </Link>
      {context && <Text style={footerContext}>{context}</Text>}
    </Section>
  );
}

// ============================================================
// Styles — explicit literal values for Outlook compatibility
// ============================================================

const main = {
  backgroundColor: colors.background,
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif",
  lineHeight: "1.5",
};

const container = {
  maxWidth: "560px",
  width: "100%",
  margin: "0 auto",
  padding: "24px 16px",
};

const header = {
  backgroundColor: colors.navy,
  color: colors.white,
  padding: "20px 24px",
  borderRadius: "8px 8px 0 0",
};

const headerTitle = {
  margin: "0",
  fontSize: "18px",
  fontWeight: "600" as const,
  color: colors.white,
};

const headerSubtitle = {
  margin: "6px 0 0 0",
  fontSize: "13px",
  color: "rgba(255,255,255,0.85)",
};

const footer = {
  padding: "16px 24px",
  borderTop: `1px solid ${colors.border}`,
  textAlign: "center" as const,
  backgroundColor: colors.surfaceLight,
  borderRadius: "0 0 8px 8px",
};

const footerLink = {
  color: colors.accent,
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: "500" as const,
};

const footerContext = {
  margin: "8px 0 0 0",
  fontSize: "11px",
  color: colors.muted,
  lineHeight: "1.4",
};
