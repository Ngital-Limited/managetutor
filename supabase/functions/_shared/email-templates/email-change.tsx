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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email address for {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>Security alert</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>Confirm your new email</Heading>
          <Text style={styles.text}>
            You requested to change your {BRAND.name} email address from{' '}
            <Link href={`mailto:${email}`} style={styles.link}>
              {email}
            </Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={styles.link}>
              {newEmail}
            </Link>
            . Click the button below to confirm this change.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Confirm Email Change
          </Button>
          <Text style={styles.smallNote}>
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            <strong>Didn't request this?</strong> Secure your account immediately by
            resetting your password and contacting our support team.
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

export default EmailChangeEmail
