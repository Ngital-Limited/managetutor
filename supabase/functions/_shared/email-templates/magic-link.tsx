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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} sign-in link</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>{BRAND.tagline}</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>Sign in to {BRAND.name}</Heading>
          <Text style={styles.text}>
            Click the button below to securely sign in. This link will expire shortly
            and can only be used once.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Sign In
          </Button>
          <Text style={styles.smallNote}>
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            If you didn't request a sign-in link, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={styles.footer}>
          © {new Date().getFullYear()} {BRAND.name} ·{' '}
          <Link href={BRAND.url} style={{ color: BRAND.muted }}>
            {BRAND.domain}
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
