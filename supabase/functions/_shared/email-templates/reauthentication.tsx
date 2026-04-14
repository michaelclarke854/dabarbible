/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for Dabar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>DABAR</Text>
        <Hr style={divider} />
        <Heading style={h1}>Verification Code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'Cinzel', 'Georgia', 'Courier', monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#C4973A',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '10px 0 30px',
  padding: '16px',
  border: '1px solid rgba(196, 151, 58, 0.3)',
  borderRadius: '2px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', textAlign: 'center' as const }
