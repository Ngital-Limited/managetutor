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
const SUCCESS = 'hsl(142, 71%, 35%)'

interface JobApprovalProps {
  parentName?: string
  jobTitle?: string
  jobReference?: string
}

const JobApprovalNotificationEmail = ({ parentName, jobTitle, jobReference }: JobApprovalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your job posting has been approved on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
        </Section>
        <Section style={body}>
          <Heading style={h1}>Job Posting Approved ✓</Heading>
          <Text style={text}>
            {parentName ? `Hi ${parentName},` : 'Hi,'}
          </Text>
          <Text style={text}>
            Your job posting has been reviewed and approved by our team. It is now
            live and visible to tutors across Bangladesh.
          </Text>
          <Section style={infoBox}>
            {jobTitle && <Text style={infoLabel}>Job: {jobTitle}</Text>}
            {jobReference && <Text style={infoMeta}>Reference: {jobReference}</Text>}
            <Text style={{ ...statusBadge, color: SUCCESS, borderColor: SUCCESS }}>Approved & Live</Text>
          </Section>
          <Text style={text}>
            Qualified tutors in your district will be notified automatically. You'll
            receive an email when a tutor applies.
          </Text>
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Button style={button} href={DASHBOARD_URL}>
              View Your Jobs
            </Button>
          </Section>
          <Text style={smallNote}>
            You're receiving this because you posted a job on{' '}
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
  component: JobApprovalNotificationEmail,
  subject: (data: Record<string, any>) =>
    data.jobTitle
      ? `Your job "${data.jobTitle}" has been approved`
      : 'Your job posting has been approved',
  displayName: 'Job approval notification',
  previewData: { parentName: 'Rahim', jobTitle: 'Math Tutor in Dhaka', jobReference: 'MT-00042' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { padding: '28px 32px 20px', borderBottom: `3px solid ${PRIMARY}` }
const brand = { fontSize: '22px', fontWeight: 700 as const, color: PRIMARY, margin: 0, letterSpacing: '-0.01em' }
const tag = { fontSize: '12px', color: MUTED, margin: '4px 0 0' }
const body = { padding: '32px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: FOREGROUND, margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: FOREGROUND, lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { border: `1px solid ${BORDER}`, backgroundColor: SOFT, borderRadius: '0.5rem', padding: '14px 16px', margin: '0 0 16px' }
const infoLabel = { fontSize: '14px', fontWeight: 700 as const, color: FOREGROUND, margin: '0 0 4px' }
const infoMeta = { fontSize: '13px', color: MUTED, margin: '0 0 8px' }
const statusBadge = { fontSize: '13px', fontWeight: 700 as const, border: '1px solid', borderRadius: '4px', padding: '2px 10px', display: 'inline-block', margin: 0 }
const button = { backgroundColor: PRIMARY, color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '0.5rem', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const smallNote = { fontSize: '13px', color: MUTED, lineHeight: '1.5', margin: '20px 0 0' }
const footer = { padding: '20px 32px 28px', borderTop: `1px solid ${BORDER}`, fontSize: '12px', color: MUTED, lineHeight: '1.5' }
