
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// Use standard PDF font for reliability in serverless environments
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1a1a2e',
        backgroundColor: '#ffffff'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    companySection: { flexDirection: 'row', alignItems: 'flex-start' },
    logo: { width: 50, height: 50, marginRight: 12, borderRadius: 8 },
    logoPlaceholder: { width: 50, height: 50, marginRight: 12, backgroundColor: '#1a1a2e', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    logoText: { color: '#00d4aa', fontSize: 20, fontWeight: 700 },
    companyName: { fontSize: 24, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
    companyDetails: { fontSize: 9, color: '#6b7280', lineHeight: 1.4 },
    invoiceTitle: { textAlign: 'right' },
    invoiceLabel: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', letterSpacing: 2 },
    invoiceNumber: { fontSize: 14, fontWeight: 600, color: '#1a1a2e', backgroundColor: '#f3f4f6', padding: '6 12', borderRadius: 4, marginTop: 8, marginBottom: 12 },
    dateRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
    dateLabel: { fontSize: 9, color: '#6b7280', width: 50, textAlign: 'right', marginRight: 8 },
    dateValue: { fontSize: 9, fontWeight: 600, color: '#1a1a2e' },
    statusBanner: { backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 30, flexDirection: 'row', alignItems: 'center' },
    statusIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    statusIconText: { color: '#ffffff', fontSize: 12, fontWeight: 700 },
    statusText: { flex: 1 },
    statusTitle: { fontSize: 10, fontWeight: 600, color: '#166534', marginBottom: 2 },
    statusDescription: { fontSize: 9, color: '#15803d' },
    twoColumn: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    recipientSection: { flex: 1 },
    sectionLabel: { fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: 3, marginBottom: 8 },
    recipientName: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
    recipientEmail: { fontSize: 10, color: '#3b82f6' },
    amountSection: { alignItems: 'flex-end' },
    amountLabel: { fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: 2, marginBottom: 4 },
    amountRow: { flexDirection: 'row', alignItems: 'flex-start' },
    currencySymbol: { fontSize: 18, fontWeight: 600, color: '#00d4aa', marginRight: 2, marginTop: 8 },
    amountValue: { fontSize: 48, fontWeight: 700, color: '#1a1a2e' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    verifiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
    verifiedText: { fontSize: 9, fontWeight: 600, color: '#22c55e', letterSpacing: 1 },
    table: { marginTop: 20 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: '12 16', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
    tableHeaderText: { color: '#ffffff', fontSize: 9, fontWeight: 600, letterSpacing: 1 },
    colDescription: { flex: 3 },
    colQty: { flex: 1, textAlign: 'center' },
    colRate: { flex: 1.5, textAlign: 'right' },
    colAmount: { flex: 1.5, textAlign: 'right' },
    tableRow: { flexDirection: 'row', padding: '16 16', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#ffffff' },
    tableRowAlt: { backgroundColor: '#f9fafb' },
    itemDescription: { fontSize: 11, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 },
    itemReference: { fontSize: 8, color: '#9ca3af' },
    itemQty: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
    itemRate: { fontSize: 11, color: '#6b7280', textAlign: 'right' },
    itemAmount: { fontSize: 11, fontWeight: 600, color: '#1a1a2e', textAlign: 'right' },
    totalsSection: { marginTop: 20, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', width: 250 },
    totalLabel: { fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: 1, flex: 1 },
    totalValue: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', textAlign: 'right', minWidth: 100 },
    footer: { position: 'absolute', bottom: 40, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 20 },
    footerText: { fontSize: 8, color: '#9ca3af' },
    footerBrand: { fontSize: 8, color: '#9ca3af' },
})

interface InvoiceLineItem {
    description: string
    reference?: string
    quantity: number
    rate: number
    amount: number
}

interface InvoicePDFProps {
    companyName: string
    companyAddress?: string
    companyPhone?: string
    companyEmail?: string
    companyLogo?: string
    invoiceNumber: string
    issueDate: string
    dueDate: string
    status?: 'draft' | 'sent' | 'paid' | 'overdue'
    recipientName: string
    recipientEmail: string
    lineItems: InvoiceLineItem[]
    currency?: string
    currencySymbol?: string
}

export function InvoicePDF({
    companyName, companyAddress, companyPhone, companyEmail, companyLogo,
    invoiceNumber, issueDate, dueDate, status = 'sent',
    recipientName, recipientEmail, lineItems, currency = 'CAD', currencySymbol = 'CA$'
}: InvoicePDFProps) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const total = subtotal
    const formatCurrency = (amount: number) => `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    const formatAmount = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 0 })

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {status === 'paid' && (
                    <View style={styles.statusBanner}>
                        <View style={styles.statusIcon}><Text style={styles.statusIconText}>✓</Text></View>
                        <View style={styles.statusText}>
                            <Text style={styles.statusTitle}>STATUS BULLETIN</Text>
                            <Text style={styles.statusDescription}>This transaction has been fully verified, settled, and logged in the revenue ledger.</Text>
                        </View>
                    </View>
                )}
                <View style={styles.header}>
                    <View style={styles.companySection}>
                        <View style={styles.logoPlaceholder}><Text style={styles.logoText}>⚡</Text></View>
                        <View>
                            <Text style={styles.companyName}>{companyName}</Text>
                            <Text style={styles.companyDetails}>{companyAddress && `${companyAddress}\n`}{companyPhone && companyEmail && `${companyPhone} • ${companyEmail}`}</Text>
                        </View>
                    </View>
                    <View style={styles.invoiceTitle}>
                        <Text style={styles.invoiceLabel}>INVOICE</Text>
                        <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
                        <View style={styles.dateRow}><Text style={styles.dateLabel}>ISSUED:</Text><Text style={styles.dateValue}>{issueDate}</Text></View>
                        <View style={styles.dateRow}><Text style={styles.dateLabel}>DUE:</Text><Text style={styles.dateValue}>{dueDate}</Text></View>
                    </View>
                </View>
                <View style={styles.twoColumn}>
                    <View style={styles.recipientSection}>
                        <Text style={styles.sectionLabel}>RECIPIENT INFORMATION</Text>
                        <Text style={styles.recipientName}>{recipientName}</Text>
                        <Text style={styles.recipientEmail}>{recipientEmail}</Text>
                    </View>
                    <View style={styles.amountSection}>
                        <Text style={styles.amountLabel}>TOTAL AMOUNT DUE</Text>
                        <View style={styles.amountRow}><Text style={styles.currencySymbol}>{currencySymbol}</Text><Text style={styles.amountValue}>{formatAmount(total)}</Text></View>
                        {status === 'paid' && <View style={styles.verifiedBadge}><View style={styles.verifiedDot} /><Text style={styles.verifiedText}>LEDGER VERIFIED</Text></View>}
                    </View>
                </View>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colDescription]}>SERVICE DESCRIPTION</Text>
                        <Text style={[styles.tableHeaderText, styles.colQty]}>QTY</Text>
                        <Text style={[styles.tableHeaderText, styles.colRate]}>RATE</Text>
                        <Text style={[styles.tableHeaderText, styles.colAmount]}>AMOUNT</Text>
                    </View>
                    {lineItems.map((item, index) => (
                        <View key={index} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}>
                            <View style={styles.colDescription}>
                                <Text style={styles.itemDescription}>{item.description}</Text>
                                {item.reference && <Text style={styles.itemReference}>REFERENCE: {item.reference}</Text>}
                            </View>
                            <Text style={[styles.itemQty, styles.colQty]}>{item.quantity}</Text>
                            <Text style={[styles.itemRate, styles.colRate]}>{formatCurrency(item.rate)}</Text>
                            <Text style={[styles.itemAmount, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TRANSACTION SUBTOTAL</Text>
                        <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                    </View>
                </View>
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Generated by PropFlow • {new Date().toLocaleDateString()}</Text>
                    <Text style={styles.footerBrand}>propflow.pro</Text>
                </View>
            </Page>
        </Document>
    )
}
