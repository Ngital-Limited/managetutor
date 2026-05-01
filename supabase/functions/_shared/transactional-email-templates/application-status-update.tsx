/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ManageTutor'
const SITE_URL = 'https://managetutor.com'
const DASHBOARD_URL = 'https://managetutor.com/dashboard/tutor'
const JOBS_URL = 'https://managetutor.com/jobs'

const PRIMARY = 'hsl(211, 85%, 45%)'
const FOREGROUND = 'hsl(222, 47%, 16%)'
const MUTED = 'hsl(215, 10%, 46%)'
const BORDER = 'hsl(214, 20%, 90%)'
const SOFT = 'hsl(210, 20%, 98%)'
const SUCCESS = 'hsl(142, 71%, 35%)'
const DANGER = 'hsl(0, 72%, 51%)'

interface ApplicationStatusProps {
  tutorName?: string
  jobTitle?: string
  status?: 'accepted' | 'rejected'
}

const ApplicationStatusUpdateEmail = ({ tutorName, jobTitle, status }: ApplicationStatusProps) => {
  const accepted = status === 'accepted'
  const statusColor = accepted ? SUCCESS : DANGER
  const statusLabel = accepted ? 'Accepted' : 'Not Selected'
  const heading = accepted ? 'Congratulations!' : 'Application Update'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {accepted
          ? `You've been selected for "${jobTitle || 'a tuition job'}"`
          : `Update on your application for "${jobTitle || 'a tuition job'}"`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
            <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>{heading}</Heading>
            <Text style={text}>
              {tutorName ? `Hi ${tutorName},` : 'Hi,'}
            </Text>
            <Section style={statusBox}>
              <Text style={{ ...statusBadge, color: statusColor, borderColor: statusColor }}>
                {statusLabel}
              </Text>
              <Text style={statusText}>
                {accepted
                  ? `You have been selected for the job${jobTitle ? `: "${jobTitle}"` : ''}. The parent will reach out to you with further details.`
                  : `Unfortunately, your application${jobTitle ? ` for "${jobTitle}"` : ''} was not selected this time. Don't worry — there are plenty more opportunities.`}
              </Text>
            </Section>
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Button style={button} href={accepted ? DASHBOARD_URL : JOBS_URL}>
                {accepted ? 'View Dashboard' : 'Browse More Jobs'}
              </Button>
            </Section>
            <Text style={smallNote}>
              You're receiving this because you applied to a job on{' '}
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
}

export const template = {
  component: ApplicationStatusUpdateEmail,
  subject: (data: Record<string, any>) =>
    data.status === 'accepted'
      ? `You've been selected for "${data.jobTitle || 'a tuition job'}"`
      : `Update on your application for "${data.jobTitle || 'a tuition job'}"`,
  displayName: 'Application status update',
  previewData: { tutorName: 'Karim', jobTitle: 'Math Tutor in Dhaka', status: 'accepted' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto' }
const header = { padding: '28px 32px 20px', borderBottom: `3px solid ${PRIMARY}` }
const brand = { fontSize: '22px', fontWeight: 700 as const, color: PRIMARY, margin: 0, letterSpacing: '-0.01em' }
const tag = { fontSize: '12px', color: MUTED, margin: '4px 0 0' }
const body = { padding: '32px' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: FOREGROUND, margin: '0 0 12px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: FOREGROUND, lineHeight: '1.6', margin: '0 0 16px' }
const statusBox = { border: `1px solid ${BORDER}`, backgroundColor: SOFT, borderRadius: '0.5rem', padding: '14px 16px', margin: '0 0 10px' }
const statusBadge = { fontSize: '13px', fontWeight: 700 as const, border: '1px solid', borderRadius: '4px', padding: '2px 10px', display: 'inline-block', margin: '0 0 8px' }
const statusText = { fontSize: '14px', color: FOREGROUND, lineHeight: '1.5', margin: 0 }
const button = { backgroundColor: PRIMARY, color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '0.5rem', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const smallNote = { fontSize: '13px', color: MUTED, lineHeight: '1.5', margin: '20px 0 0' }
const footer = { padding: '20px 32px 28px', borderTop: `1px solid ${BORDER}`, fontSize: '12px', color: MUTED, lineHeight: '1.5' }
