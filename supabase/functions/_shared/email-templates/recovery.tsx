/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for Dabar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>DABAR</Text>
        <Hr style={divider} />
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          We received a request to reset your Dabar password. Click the button
          below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email. Your
          password will remain unchanged.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '480px', margin: '0 auto' }
const brand = {
  fontFamily: "'Cinzel', 'Georgia', 'Times New Roman', serif",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#C4973A',
  textAlign: 'center' as const,
  letterSpacing: '6px',
  margin: '0 0 20px',
}
const divider = { borderColor: '#C4973A', borderWidth: '1px', margin: '0 0 30px', opacity: 0.4 }
const h1 = {
  fontFamily: "'Cinzel', 'Georgia', 'Times New Roman', serif",
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0F0D0A',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#3a3632',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#C4973A',
  color: '#ffffff',
  fontFamily: "'Cinzel', 'Georgia', 'Times New Roman', serif",
  fontSize: '14px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  borderRadius: '2px',
  padding: '14px 28px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  display: 'block' as const,
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
