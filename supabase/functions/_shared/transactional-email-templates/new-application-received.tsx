/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ManageTutor'
const SITE_URL = 'https://managetutor.com'
const DASHBOARD_URL = 'https://managetutor.com/dashboard/parent'

const PRIMARY = 'hsl(211, 85%, 45%)'
const FOREGROUND = 'hsl(222, 47%, 16%)'
const MUTED = 'hsl(215, 10%, 46%)'
const BORDER = 'hsl(214, 20%, 90%)'
const SOFT = 'hsl(210, 20%, 98%)'

interface NewApplicationProps {
  parentName?: string
  tutorName?: string
  jobTitle?: string
}

const NewApplicationReceivedEmail = ({ parentName, tutorName, jobTitle }: NewApplicationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A tutor has applied to your job posting on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
        </Section>
        <Section style={body}>
          <Heading style={h1}>New Application Received</Heading>
          <Text style={text}>
            {parentName ? `Hi ${parentName},` : 'Hi,'}
          </Text>
          <Text style={text}>
            Great news! A tutor{tutorName ? ` (${tutorName})` : ''} has applied to your
            job posting{jobTitle ? `: "${jobTitle}"` : ''}.
          </Text>
          <Section style={infoBox}>
            <Text style={infoLabel}>What's next?</Text>
            <Text style={infoText}>
              Review the tutor's profile, qualifications, and experience. If they're a
              good fit, you can accept their application from your dashboard.
            </Text>
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button style={button} href={DASHBOARD_URL}>
              Review Applications
            </Button>
          </Section>
          <Text style={smallNote}>
            You're receiving this because a tutor applied to a job you posted on{' '}
            <Link href={SITE_URL} style={link}>{SITE_NAME}</Link>.
          </Text>
        </Section>
        <Section style={footer}>
          © {new Date().getFullYear()} {SITE_NAME} ·{' '}
          <Link href={SITE_URL} style={{ color: MUTED }}>managetutor.com</Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewApplicationReceivedEmail,
  subject: (data: Record<string, any>) =>
    data.jobTitle
      ? `New application for "${data.jobTitle}"`
      : 'New application received for your job posting',
  displayName: 'New application received',
  previewData: { parentName: 'Rahim', tutorName: 'Karim Ahmed', jobTitle: 'Math Tutor in Dhaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { padding: '28px 32px 20px', borderBottom: `3px solid ${PRIMARY}` }
const brand = { fontSize: '22px', fontWeight: 700 as const, color: PRIMARY, margin: 0, letterSpacing: '-0.01em' }
const tag = { fontSize: '12px', color: MUTED, margin: '4px 0 0' }
const body = { padding: '32px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: FOREGROUND, margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: FOREGROUND, lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { border: `1px solid ${BORDER}`, backgroundColor: SOFT, borderRadius: '0.5rem', padding: '14px 16px', margin: '0 0 10px' }
const infoLabel = { fontSize: '14px', fontWeight: 700 as const, color: FOREGROUND, margin: '0 0 4px' }
const infoText = { fontSize: '13px', color: MUTED, lineHeight: '1.5', margin: 0 }
const button = { backgroundColor: PRIMARY, color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '0.5rem', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const smallNote = { fontSize: '13px', color: MUTED, lineHeight: '1.5', margin: '20px 0 0' }
const footer = { padding: '20px 32px 28px', borderTop: `1px solid ${BORDER}`, fontSize: '12px', color: MUTED, lineHeight: '1.5' }
