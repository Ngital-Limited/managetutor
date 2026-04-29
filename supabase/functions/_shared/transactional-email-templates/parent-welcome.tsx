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
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ManageTutor'
const SITE_URL = 'https://managetutor.com'
const POST_JOB_URL = 'https://managetutor.com/dashboard/parent/jobs/new'
const PRIMARY = 'hsl(211, 85%, 45%)'
const FOREGROUND = 'hsl(222, 47%, 16%)'
const MUTED = 'hsl(215, 10%, 46%)'
const BORDER = 'hsl(214, 20%, 90%)'
const SOFT = 'hsl(210, 20%, 98%)'

interface ParentWelcomeProps {
  name?: string
}

const ParentWelcomeEmail = ({ name }: ParentWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — here's how to find your perfect tutor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
        </Section>

        <Section style={body}>
          <Heading style={h1}>
            {name ? `Welcome, ${name}!` : 'Welcome to ManageTutor!'}
          </Heading>
          <Text style={text}>
            Thanks for joining {SITE_NAME}. You're just a few steps away from
            connecting with verified tutors across all 64 districts of Bangladesh.
          </Text>

          <Heading style={h2}>How to post a tutor request</Heading>

          <Section style={stepBox}>
            <Text style={stepNum}>1</Text>
            <Text style={stepTitle}>Post your tuition job</Text>
            <Text style={stepText}>
              Add subjects, class level, location, schedule, and your budget.
              Our team reviews each post to keep the platform safe.
            </Text>
          </Section>

          <Section style={stepBox}>
            <Text style={stepNum}>2</Text>
            <Text style={stepTitle}>Receive applications</Text>
            <Text style={stepText}>
              Verified tutors in your area will apply. Review profiles, ratings,
              education, and 30-second video introductions.
            </Text>
          </Section>

          <Section style={stepBox}>
            <Text style={stepNum}>3</Text>
            <Text style={stepTitle}>Request a demo class</Text>
            <Text style={stepText}>
              Shortlist a tutor and request a demo class. Once both sides agree,
              you start regular sessions.
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <Button style={button} href={POST_JOB_URL}>
              Post a Tutor Request
            </Button>
          </Section>

          <Text style={smallNote}>
            Need help? Just reply to this email or visit{' '}
            <Link href={SITE_URL} style={link}>
              {SITE_URL.replace('https://', '')}
            </Link>
            .
          </Text>
        </Section>

        <Section style={footer}>
          © {new Date().getFullYear()} {SITE_NAME} ·{' '}
          <Link href={SITE_URL} style={{ color: MUTED }}>
            managetutor.com
          </Link>
          <br />
          You're receiving this email because you signed up for a {SITE_NAME} parent account.
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ParentWelcomeEmail,
  subject: 'Welcome to ManageTutor — let\'s find your tutor',
  displayName: 'Parent welcome',
  previewData: { name: 'Rahim' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto' }
const header = {
  padding: '28px 32px 20px',
  borderBottom: `3px solid ${PRIMARY}`,
}
const brand = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: PRIMARY,
  margin: 0,
  letterSpacing: '-0.01em',
}
const tag = { fontSize: '12px', color: MUTED, margin: '4px 0 0' }
const body = { padding: '32px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 700 as const,
  color: FOREGROUND,
  margin: '0 0 12px',
  lineHeight: '1.3',
}
const h2 = {
  fontSize: '16px',
  fontWeight: 700 as const,
  color: FOREGROUND,
  margin: '24px 0 12px',
}
const text = {
  fontSize: '15px',
  color: FOREGROUND,
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const stepBox = {
  border: `1px solid ${BORDER}`,
  backgroundColor: SOFT,
  borderRadius: '0.5rem',
  padding: '14px 16px',
  margin: '0 0 10px',
}
const stepNum = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 700 as const,
  color: '#ffffff',
  backgroundColor: PRIMARY,
  width: '22px',
  height: '22px',
  borderRadius: '11px',
  textAlign: 'center' as const,
  lineHeight: '22px',
  margin: '0 0 6px',
}
const stepTitle = {
  fontSize: '14px',
  fontWeight: 700 as const,
  color: FOREGROUND,
  margin: '0 0 4px',
}
const stepText = {
  fontSize: '13px',
  color: MUTED,
  lineHeight: '1.5',
  margin: 0,
}
const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '0.5rem',
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const link = { color: PRIMARY, textDecoration: 'underline' }
const smallNote = {
  fontSize: '13px',
  color: MUTED,
  lineHeight: '1.5',
  margin: '20px 0 0',
}
const footer = {
  padding: '20px 32px 28px',
  borderTop: `1px solid ${BORDER}`,
  fontSize: '12px',
  color: MUTED,
  lineHeight: '1.5',
}
