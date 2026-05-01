/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ManageTutor'
const SITE_URL = 'https://managetutor.com'
const PROFILE_URL = 'https://managetutor.com/dashboard/tutor/profile'
const JOBS_URL = 'https://managetutor.com/jobs'

const PRIMARY = 'hsl(211, 85%, 45%)'
const FOREGROUND = 'hsl(222, 47%, 16%)'
const MUTED = 'hsl(215, 10%, 46%)'
const BORDER = 'hsl(214, 20%, 90%)'
const SOFT = 'hsl(210, 20%, 98%)'
const SUCCESS = 'hsl(142, 71%, 35%)'
const DANGER = 'hsl(0, 72%, 51%)'

interface TutorApprovalProps {
  tutorName?: string
  status?: 'approved' | 'rejected'
  reason?: string
}

const TutorApprovalStatusEmail = ({ tutorName, status, reason }: TutorApprovalProps) => {
  const approved = status === 'approved'
  const statusColor = approved ? SUCCESS : DANGER
  const statusLabel = approved ? 'Approved' : 'Needs Revision'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {approved
          ? `Your tutor profile has been approved on ${SITE_NAME}`
          : `Your tutor profile needs attention on ${SITE_NAME}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{SITE_NAME}</Text>
            <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>
              {approved ? 'Profile Approved ✓' : 'Profile Review Update'}
            </Heading>
            <Text style={text}>
              {tutorName ? `Hi ${tutorName},` : 'Hi,'}
            </Text>

            <Section style={statusBox}>
              <Text style={{ ...statusBadge, color: statusColor, borderColor: statusColor }}>
                {statusLabel}
              </Text>
              <Text style={statusText}>
                {approved
                  ? 'Your tutor profile has been verified and approved. You can now apply to tuition jobs and be discovered by parents across Bangladesh.'
                  : 'Our team has reviewed your profile and found some areas that need attention before it can be approved.'}
              </Text>
            </Section>

            {!approved && reason && (
              <Section style={reasonBox}>
                <Text style={reasonLabel}>Feedback from reviewer:</Text>
                <Text style={reasonText}>{reason}</Text>
              </Section>
            )}

            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Button style={button} href={approved ? JOBS_URL : PROFILE_URL}>
                {approved ? 'Browse Jobs' : 'Update Profile'}
              </Button>
            </Section>

            <Text style={smallNote}>
              You're receiving this because you registered as a tutor on{' '}
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
  component: TutorApprovalStatusEmail,
  subject: (data: Record<string, any>) =>
    data.status === 'approved'
      ? 'Your ManageTutor profile has been approved!'
      : 'Your ManageTutor profile needs attention',
  displayName: 'Tutor approval/rejection',
  previewData: { tutorName: 'Karim', status: 'approved' },
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
const reasonBox = { backgroundColor: 'hsl(0, 80%, 97%)', border: `1px solid hsl(0, 50%, 85%)`, borderRadius: '0.5rem', padding: '14px 16px', margin: '0 0 10px' }
const reasonLabel = { fontSize: '13px', fontWeight: 700 as const, color: DANGER, margin: '0 0 4px' }
const reasonText = { fontSize: '14px', color: FOREGROUND, lineHeight: '1.5', margin: 0 }
const button = { backgroundColor: PRIMARY, color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '0.5rem', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }
const link = { color: PRIMARY, textDecoration: 'underline' }
const smallNote = { fontSize: '13px', color: MUTED, lineHeight: '1.5', margin: '20px 0 0' }
const footer = { padding: '20px 32px 28px', borderTop: `1px solid ${BORDER}`, fontSize: '12px', color: MUTED, lineHeight: '1.5' }
