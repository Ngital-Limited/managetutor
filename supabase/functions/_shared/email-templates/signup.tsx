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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate your {BRAND.name} account</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>{BRAND.tagline}</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>Welcome to {BRAND.name}!</Heading>
          <Text style={styles.text}>
            Thanks for signing up. Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={styles.link}>
              {recipient}
            </Link>
            ) to activate your account and start finding the right tuition match.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm Email
          </Button>
          <Text style={styles.smallNote}>
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            If you didn't create an account on {BRAND.name}, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={styles.footer}>
          © {new Date().getFullYear()} {BRAND.name} ·{' '}
          <Link href={siteUrl || BRAND.url} style={{ color: BRAND.muted }}>
            {BRAND.domain}
          </Link>
          <br />
          You received this email because someone signed up using this address.
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
