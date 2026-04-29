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
const PROFILE_URL = 'https://managetutor.com/dashboard/tutor/profile'
const JOBS_URL = 'https://managetutor.com/jobs'
const RESET_URL = 'https://managetutor.com/auth/reset-password'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.managetutor.app'
const APP_STORE_URL = 'https://apps.apple.com/app/managetutor/id0000000000'

const PRIMARY = 'hsl(211, 85%, 45%)'
const FOREGROUND = 'hsl(222, 47%, 16%)'
const MUTED = 'hsl(215, 10%, 46%)'
const BORDER = 'hsl(214, 20%, 90%)'
const SOFT = 'hsl(210, 20%, 98%)'

interface TutorWelcomeProps {
  name?: string
}

const TutorWelcomeEmail = ({ name }: TutorWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — set your password and start finding students</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>{SITE_NAME}</Text>
          <Text style={tag}>Bangladesh's Home Tuition Marketplace</Text>
        </Section>

        <Section style={body}>
          <Heading style={h1}>
            {name ? `Welcome aboard, ${name}!` : 'Welcome aboard, Tutor!'}
          </Heading>
          <Text style={text}>
            Thanks for joining {SITE_NAME}. Parents across all 64 districts of
            Bangladesh are looking for verified tutors like you. Let's get your
            account ready.
          </Text>

          <Heading style={h2}>Get started in 3 steps</Heading>

          <Section style={stepBox}>
            <Text style={stepNum}>1</Text>
            <Text style={stepTitle}>Set your password</Text>
            <Text style={stepText}>
              Secure your account by setting (or resetting) your password so you
              can sign in anytime.
            </Text>
            <Section style={{ margin: '10px 0 0' }}>
              <Button style={smallButton} href={RESET_URL}>
                Set / Reset Password
              </Button>
            </Section>
          </Section>

          <Section style={stepBox}>
            <Text style={stepNum}>2</Text>
            <Text style={stepTitle}>Complete your profile</Text>
            <Text style={stepText}>
              Add your education, subjects, location, hourly rate, and a 30-second
              video intro. Profiles above 70% completeness get more matches.
            </Text>
            <Section style={{ margin: '10px 0 0' }}>
              <Button style={smallButton} href={PROFILE_URL}>
                Complete Profile
              </Button>
            </Section>
          </Section>

          <Section style={stepBox}>
            <Text style={stepNum}>3</Text>
            <Text style={stepTitle}>Apply to tuition jobs</Text>
            <Text style={stepText}>
              Browse jobs in your district and apply to ones that match your
              schedule and subjects. You'll be notified the moment a parent responds.
            </Text>
            <Section style={{ margin: '10px 0 0' }}>
              <Button style={smallButton} href={JOBS_URL}>
                Browse Jobs
              </Button>
            </Section>
          </Section>

          <Heading style={h2}>Take ManageTutor with you</Heading>
          <Text style={text}>
            Get instant notifications for new jobs and applications — download the
            mobile app:
          </Text>

          <Section style={{ textAlign: 'center', margin: '8px 0 8px' }}>
            <Button style={storeButton} href={PLAY_STORE_URL}>
              Get it on Google Play
            </Button>
            <Text style={{ display: 'inline-block', width: '8px' }}> </Text>
            <Button style={storeButtonAlt} href={APP_STORE_URL}>
              Download on the App Store
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
          You're receiving this email because you signed up for a {SITE_NAME} tutor account.
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TutorWelcomeEmail,
  subject: 'Welcome to ManageTutor — set your password & start tutoring',
  displayName: 'Tutor welcome',
  previewData: { name: 'Karim' },
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
const smallButton = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600 as const,
  borderRadius: '0.5rem',
  padding: '8px 16px',
  textDecoration: 'none',
  display: 'inline-block',
}
const storeButton = {
  backgroundColor: FOREGROUND,
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600 as const,
  borderRadius: '0.5rem',
  padding: '10px 18px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 4px 8px',
}
const storeButtonAlt = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600 as const,
  borderRadius: '0.5rem',
  padding: '10px 18px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 4px 8px',
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
