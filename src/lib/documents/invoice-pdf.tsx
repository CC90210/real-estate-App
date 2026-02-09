
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'

// 1. High-Fidelity Styles to match PropFlow Web Interface
const styles = StyleSheet.create({
    page: {
        padding: 48,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#0f172a',
        backgroundColor: '#ffffff'
    },
    // Header Section
    headerLine: {
        borderBottomWidth: 3,
        borderBottomColor: '#0f172a',
        paddingBottom: 24,
        marginBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    brandSection: {
        flexDirection: 'row',
        gap: 12
    },
    logoBox: {
        width: 42,
        height: 42,
        backgroundColor: '#0f172a',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    logoText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    companyMeta: {
        fontSize: 8,
        color: '#64748b',
        lineHeight: 1.4,
        fontWeight: 'medium'
    },
    invoiceTitleSection: {
        alignItems: 'flex-end'
    },
    titleText: {
        fontSize: 32,
        fontWeight: 'extrabold',
        letterSpacing: -1.5,
        color: '#0f172a',
        marginBottom: 4
    },
    invoiceBadge: {
        backgroundColor: '#0f172a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12
    },
    invoiceNumber: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    metaGrid: {
        alignItems: 'flex-end',
        gap: 2
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8
    },
    metaLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    metaValue: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#0f172a'
    },

    // Status Banner
    statusAlert: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    statusIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#f0f9ff',
        justifyContent: 'center',
        alignItems: 'center'
    },
    statusIcon: {
        color: '#0284c7',
        fontSize: 14,
        fontWeight: 'bold'
    },
    statusContent: {
        flex: 1
    },
    statusLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 2
    },
    statusValue: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#334155'
    },

    // Sub-Details Grid
    detailsGrid: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40
    },
    recipientBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        padding: 20
    },
    boxLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 2,
        marginBottom: 10
    },
    recipientNameBase: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 2
    },
    recipientEmailBase: {
        fontSize: 8,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    propertySection: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 8,
    },
    propertyLabel: {
        fontSize: 6,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 2
    },
    propertyValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    propertyValue: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    unitBadge: {
        backgroundColor: '#0f172a',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    unitText: {
        color: '#ffffff',
        fontSize: 6,
        fontWeight: 'bold',
    },
    logoImage: {
        width: 32,
        height: 32,
        objectFit: 'contain'
    },
    totalBoxColumn: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 12
    },
    bigTotalLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 4
    },
    bigTotalRow: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    bigCurrency: {
        fontSize: 18,
        color: '#cbd5e1',
        fontWeight: 'bold',
        marginRight: 6,
        marginTop: 6
    },
    bigTotalValue: {
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: -2,
        color: '#0f172a'
    },

    // Table Styling
    tableContainer: {
        marginBottom: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        overflow: 'hidden'
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        paddingVertical: 14,
        paddingHorizontal: 16
    },
    tableHeaderText: {
        color: '#ffffff',
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: 'center' },
    colRate: { flex: 1.5, textAlign: 'right' },
    colAmount: { flex: 1.5, textAlign: 'right' },

    itemTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 2
    },
    itemSub: {
        fontSize: 7,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    itemText: {
        fontSize: 9,
        color: '#475569',
        fontWeight: 'bold'
    },
    itemPrice: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#0f172a'
    },

    // Summary Section
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 40
    },
    notesBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    settlementColumn: {
        width: 250,
        justifyContent: 'flex-end'
    },
    settlementActionRow: {
        borderTopWidth: 2,
        borderTopColor: '#0f172a',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline'
    },
    settleLabel: {
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#94a3b8',
        letterSpacing: 1
    },
    settleAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0f172a',
        letterSpacing: -0.5
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 48,
        right: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9'
    },
    footerLabel: {
        fontSize: 7,
        color: '#94a3b8',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    }
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
    notes?: string
    propertyAddress?: string
    propertyUnit?: string
}

export function InvoicePDF({
    companyName, companyAddress, companyPhone, companyEmail, companyLogo,
    invoiceNumber, issueDate, dueDate, status = 'sent',
    recipientName, recipientEmail, lineItems, currency = 'CAD', currencySymbol = 'CA$',
    notes, propertyAddress, propertyUnit
}: InvoicePDFProps) {
    const total = lineItems.reduce((sum, item) => sum + item.amount, 0)

    // We expect amounts to be in DOLLARS now (division handled in generator)
    const formatValue = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    const formatCurrency = (val: number) => `${currencySymbol}${formatValue(val)}`

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section */}
                <View style={styles.headerLine}>
                    <View style={styles.brandSection}>
                        <View style={styles.logoBox}>
                            {companyLogo ? (
                                <Image src={companyLogo} style={styles.logoImage} />
                            ) : (
                                <Text style={styles.logoText}>i</Text>
                            )}
                        </View>
                        <View>
                            <Text style={styles.companyName}>{companyName}</Text>
                            <Text style={styles.companyMeta}>{companyAddress}</Text>
                            <Text style={styles.companyMeta}>{companyPhone} • {companyEmail}</Text>
                        </View>
                    </View>
                    <View style={styles.invoiceTitleSection}>
                        <Text style={styles.titleText}>INVOICE</Text>
                        <View style={styles.invoiceBadge}>
                            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
                        </View>
                        <View style={styles.metaGrid}>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Issued:</Text>
                                <Text style={styles.metaValue}>{issueDate}</Text>
                            </View>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Due:</Text>
                                <Text style={styles.metaValue}>{dueDate}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Status Banner */}
                <View style={styles.statusAlert}>
                    <View style={styles.statusIconCircle}>
                        <Text style={styles.statusIcon}>{status === 'paid' ? '✓' : 'ℹ'}</Text>
                    </View>
                    <View style={styles.statusContent}>
                        <Text style={styles.statusLabel}>Status Bulletin</Text>
                        <Text style={styles.statusValue}>
                            {status === 'paid'
                                ? 'This transaction has been fully verified and settled in the revenue ledger.'
                                : 'Digitally verified ledger entry. Awaiting settlement as per agreed terms.'}
                        </Text>
                    </View>
                </View>

                {/* Recipient and Total Row */}
                <View style={styles.detailsGrid}>
                    <View style={styles.recipientBox}>
                        <Text style={styles.boxLabel}>Recipient Information</Text>
                        <Text style={styles.recipientNameBase}>{recipientName}</Text>
                        <Text style={styles.recipientEmailBase}>{recipientEmail}</Text>

                        {(propertyAddress || propertyUnit) && (
                            <View style={styles.propertySection}>
                                <Text style={styles.propertyLabel}>Linked Asset</Text>
                                <View style={styles.propertyValueRow}>
                                    <Text style={styles.propertyValue}>{propertyAddress}</Text>
                                    {propertyUnit && (
                                        <View style={styles.unitBadge}>
                                            <Text style={styles.unitText}>UNIT {propertyUnit}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                    <View style={styles.totalBoxColumn}>
                        <Text style={styles.bigTotalLabel}>Total Amount Due</Text>
                        <View style={styles.bigTotalRow}>
                            <Text style={styles.bigCurrency}>{currencySymbol}</Text>
                            <Text style={styles.bigTotalValue}>{formatValue(total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Line Items Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colDesc]}>Service Description</Text>
                        <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
                        <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
                    </View>
                    {lineItems.map((item, idx) => (
                        <View key={idx} style={[styles.tableRow, { backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }]}>
                            <View style={styles.colDesc}>
                                <Text style={styles.itemTitle}>{item.description}</Text>
                                <Text style={styles.itemSub}>Reference: {item.reference || `TRX-${idx + 101}`}</Text>
                            </View>
                            <Text style={[styles.itemText, styles.colQty]}>{item.quantity}</Text>
                            <Text style={[styles.itemText, styles.colRate]}>{formatCurrency(item.rate)}</Text>
                            <Text style={[styles.itemPrice, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
                        </View>
                    ))}
                    {/* Interior Subtotal Row */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        <Text style={[styles.metaLabel, { flex: 1, textAlign: 'right', marginRight: 16 }]}>Transaction Subtotal</Text>
                        <Text style={[styles.itemPrice, { width: 100, textAlign: 'right' }]}>{formatCurrency(total)}</Text>
                    </View>
                </View>

                {/* Bottom Sections */}
                <View style={styles.summaryGrid}>
                    <View style={styles.notesBox}>
                        <Text style={styles.boxLabel}>Notes & Compliance</Text>
                        <Text style={[styles.companyMeta, { color: '#475569', fontStyle: 'italic' }]}>
                            {notes || 'This invoice is a digitally verified ledger entry. Please settle the balance as per the agreed terms of service.'}
                        </Text>
                    </View>
                    <View style={styles.settlementColumn}>
                        <View style={styles.settlementActionRow}>
                            <Text style={styles.settleLabel}>Total Settlement</Text>
                            <Text style={styles.settleAmount}>{formatCurrency(total)}</Text>
                        </View>
                        <Text style={[styles.metaLabel, { textAlign: 'right', marginTop: 4, fontSize: 6 }]}>All prices in {currency}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerLabel}>Generated by PropFlow • {new Date().toLocaleDateString()}</Text>
                    <Text style={styles.footerLabel}>PROPFLOW.PRO</Text>
                </View>
            </Page>
        </Document>
    )
}
