// ManageTutor brand tokens for auth emails
export const BRAND = {
  name: 'ManageTutor',
  domain: 'managetutor.com',
  url: 'https://managetutor.com',
  tagline: 'Bangladesh\'s Home Tuition Marketplace',
  primary: 'hsl(211, 85%, 45%)',
  primaryDark: 'hsl(211, 85%, 38%)',
  foreground: 'hsl(222, 47%, 16%)',
  muted: 'hsl(215, 10%, 46%)',
  border: 'hsl(214, 20%, 90%)',
  bgSoft: 'hsl(210, 20%, 98%)',
  radius: '0.5rem',
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '0',
  },
  header: {
    padding: '28px 32px 20px',
    borderBottom: `3px solid ${BRAND.primary}`,
    textAlign: 'left' as const,
  },
  brandWordmark: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: BRAND.primary,
    margin: 0,
    letterSpacing: '-0.01em',
  },
  brandTag: {
    fontSize: '12px',
    color: BRAND.muted,
    margin: '4px 0 0',
  },
  body: {
    padding: '32px',
  },
  h1: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: BRAND.foreground,
    margin: '0 0 16px',
    lineHeight: '1.3',
  },
  text: {
    fontSize: '15px',
    color: BRAND.foreground,
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  link: { color: BRAND.primary, textDecoration: 'underline' },
  button: {
    backgroundColor: BRAND.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: BRAND.radius,
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  codeBox: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '28px',
    fontWeight: 700 as const,
    color: BRAND.foreground,
    backgroundColor: BRAND.bgSoft,
    border: `1px solid ${BRAND.border}`,
    borderRadius: BRAND.radius,
    padding: '14px 22px',
    letterSpacing: '4px',
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  smallNote: {
    fontSize: '13px',
    color: BRAND.muted,
    lineHeight: '1.5',
    margin: '24px 0 0',
  },
  footer: {
    padding: '20px 32px 28px',
    borderTop: `1px solid ${BRAND.border}`,
    fontSize: '12px',
    color: BRAND.muted,
    lineHeight: '1.5',
  },
}
