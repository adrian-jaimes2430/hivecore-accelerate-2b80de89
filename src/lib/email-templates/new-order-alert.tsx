import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Row, Column, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface NewOrderAlertProps {
  orderCode?: string
  productName?: string
  quantity?: number
  total?: string
  seller?: string
  payment?: string
  clientName?: string
  clientPhone?: string
  clientAddress?: string
}

const rowStyle = { fontSize: '14px', color: '#111111' }
const keyStyle = { padding: '8px', background: '#f5f5f5', fontWeight: 700 as const, width: '38%' }
const valStyle = { padding: '8px' }

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Row style={rowStyle}>
      <Column style={keyStyle}>{label}</Column>
      <Column style={valStyle}>{value}</Column>
    </Row>
  )
}

export function NewOrderAlertEmail({
  orderCode = 'HC-0001',
  productName = 'Producto',
  quantity = 1,
  total = '$ 0 COP',
  seller = 'Impulsador',
  payment = 'Contra entrega (pending)',
  clientName = 'Cliente',
  clientPhone = '—',
  clientAddress = '—',
}: NewOrderAlertProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{`Nuevo pedido ${orderCode} · ${productName}`}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', background: '#ffffff', color: '#111111' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
          <Heading as="h2" style={{ margin: '0 0 12px' }}>{`🛒 Nuevo pedido ${orderCode}`}</Heading>
          <Section>
            <Field label="Producto" value={productName} />
            <Field label="Unidades" value={String(quantity)} />
            <Field label="Total" value={total} />
            <Field label="Vendedor" value={seller} />
            <Field label="Pago" value={payment} />
            <Field label="Cliente" value={clientName} />
            <Field label="Teléfono" value={clientPhone} />
            <Field label="Dirección" value={clientAddress} />
          </Section>
          <Text style={{ marginTop: '16px', fontSize: '12px', color: '#888888' }}>
            Alerta automática de HIVECORE.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NewOrderAlertEmail,
  displayName: 'Alerta de nuevo pedido',
  subject: (data: Record<string, any>) =>
    `🛒 Nuevo pedido ${data['orderCode'] ?? ''} · ${data['productName'] ?? ''}`.trim(),
  previewData: {
    orderCode: 'HC-1042',
    productName: 'Rolex Submariner Hulk',
    quantity: 1,
    total: '$ 3.600.000 COP',
    seller: 'Ana María (ana@ayoecosystem.com)',
    payment: 'Contra entrega (pending)',
    clientName: 'Juan Pérez',
    clientPhone: '+57 3106807521',
    clientAddress: 'Calle 1 #2-3 · Bogotá · Cundinamarca',
  },
} satisfies TemplateEntry
