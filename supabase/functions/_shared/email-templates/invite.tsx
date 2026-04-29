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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>{BRAND.tagline}</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>You've been invited</Heading>
          <Text style={styles.text}>
            You've been invited to join <strong>{BRAND.name}</strong>. Click the button
            below to accept and finish setting up your account.
          </Text>
          <Button style={styles.button} href={confirmationUrl}>
            Accept Invitation
          </Button>
          <Text style={styles.smallNote}>
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <Link href={confirmationUrl} style={styles.link}>
              {confirmationUrl}
            </Link>
          </Text>
          <Text style={styles.smallNote}>
            If you weren't expecting this invitation, you can safely ignore this email.
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

export default InviteEmail
