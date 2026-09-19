import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Row, Column, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderNotificationProps {
  orderCode?: string
  productName?: string
  productSku?: string
  quantity?: number
  total?: string
  clientName?: string
  clientPhone?: string
  clientAddress?: string
  notes?: string
  impulsadorName?: string
}

const rowStyle = { fontSize: '14px', color: '#111111' }
const keyStyle = { padding: '8px', background: '#f5f5f5', fontWeight: 700 as const, width: '38%' }
const valStyle = { padding: '8px' }

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Row style={rowStyle}>
      <Column style={keyStyle}>{label}</Column>
      <Column style={mono ? { ...valStyle, fontFamily: 'monospace' } : valStyle}>{value}</Column>
    </Row>
  )
}

export function OrderNotificationEmail({
  orderCode = 'HC-0001',
  productName = 'Producto',
  productSku = 'SKU',
  quantity = 1,
  total = '$ 0 COP',
  clientName = 'Cliente',
  clientPhone = '—',
  clientAddress = '—',
  notes = '—',
  impulsadorName = '—',
}: OrderNotificationProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{`Nuevo pedido ${orderCode} · ${productName}`}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', background: '#ffffff', color: '#111111' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
          <Heading as="h2" style={{ margin: '0 0 12px' }}>Nuevo pedido HIVECORE</Heading>
          <Text style={{ color: '#444444', margin: '0 0 16px' }}>
            Se ha generado un nuevo pedido en el ecosistema A&O.
          </Text>
          <Section>
            <Field label="Código" value={orderCode} />
            <Field label="Producto" value={productName} />
            <Field label="SKU" value={productSku} mono />
            <Field label="Cantidad" value={String(quantity)} />
            <Field label="Total" value={total} />
            <Field label="Cliente" value={clientName} />
            <Field label="Teléfono" value={clientPhone} />
            <Field label="Dirección" value={clientAddress} />
            <Field label="Observaciones" value={notes} />
            <Field label="Impulsador" value={impulsadorName} />
          </Section>
          <Text style={{ marginTop: '16px', fontSize: '12px', color: '#888888' }}>
            Confirma el envío desde la plataforma de dropshipping usando el SKU del producto.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OrderNotificationEmail,
  displayName: 'Notificación de pedido a operaciones',
  subject: (data: Record<string, any>) =>
    `Nuevo pedido ${data['orderCode'] ?? ''} · ${data['productName'] ?? ''}`.trim(),
  previewData: {
    orderCode: 'HC-1042',
    productName: 'Cepillo secador eléctrico',
    productSku: 'LUX-FE57258F',
    quantity: 2,
    total: '$ 240.000 COP',
    clientName: 'Juan Pérez',
    clientPhone: '+57 3106807521',
    clientAddress: 'Calle 1 #2-3, Bogotá',
    notes: 'Entregar en la tarde',
    impulsadorName: 'Ana María',
  },
} satisfies TemplateEntry
