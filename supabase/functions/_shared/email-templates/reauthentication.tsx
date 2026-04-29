/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} security verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Text style={styles.brandWordmark}>{BRAND.name}</Text>
          <Text style={styles.brandTag}>Security verification</Text>
        </Section>
        <Section style={styles.body}>
          <Heading style={styles.h1}>Your verification code</Heading>
          <Text style={styles.text}>
            Use the code below to confirm your identity. This code expires shortly.
          </Text>
          <Text style={styles.codeBox}>{token}</Text>
          <Text style={styles.smallNote}>
            If you didn't request this code, please secure your account by changing
            your password immediately. Never share this code with anyone — {BRAND.name}{' '}
            staff will never ask for it.
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

export default ReauthenticationEmail
