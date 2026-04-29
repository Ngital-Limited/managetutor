/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BRAND, styles } from './_brand.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND.name} password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>{BRAND.tagline}</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>Reset your password</Heading>
          <Text style={styles.text}>
            We received a request to reset the password for your {BRAND.name} account.
            Click the button below to choose a new password. This link will expire in 1 hour.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Reset Password
          </Button>
          <Text style={styles.smallNote}>
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            If you didn't request a password reset, you can safely ignore this email —
            your password will not change. For your security, never share this link with anyone.
          </Text>
        </Section>
        <Section style={styles.footer}>
          © {new Date().getFullYear()} {BRAND.name} ·{' '}
          <Link href={BRAND.url} style={{ color: BRAND.muted }}>
            {BRAND.domain}
          </Link>
          <br />
          This is a security-related email sent to the address on file for your account.
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
