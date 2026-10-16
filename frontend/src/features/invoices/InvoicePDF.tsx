import { useEffect, useState } from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import QRCode from "qrcode";

import { formatDateOnly, formatDateTimeSAST } from "../../utils/datetime";
import { initials } from "../../utils/initials";

import type { Invoice } from "../../api/invoices";
import type { PaymentMethod } from "../../api/paymentMethods";

/* ---------- Brand palette ---------- */
const BRAND_BLUE = "#00209F";
const BRAND_GREEN = "#009739";
const TEXT_DARK = "#202938";
const TEXT_MUTED = "#667085";
const LIGHT_BG = "#F4F6F9";
const BORDER = "#E4E7EC";

function statusStyle(code: string | null | undefined) {
  switch (code) {
    case "approved":
      return { bg: BRAND_BLUE, fg: "#FFFFFF" };
    case "paid":
      return { bg: BRAND_GREEN, fg: "#FFFFFF" };
    case "cancelled":
      return { bg: "#991B1B", fg: "#FFFFFF" };
    case "draft":
    default:
      return { bg: "#E5E7EB", fg: "#374151" };
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
    lineHeight: 1.4,
  },

  /* Top accent bar */
  topAccent: {
    height: 4,
    backgroundColor: BRAND_BLUE,
    marginBottom: 18,
    marginLeft: -36,
    marginRight: -36,
    marginTop: -36,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 12,
  },
  initialBadge: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: BRAND_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  initialBadgeText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  headerLeftText: {
    flex: 1,
    paddingLeft: 14,
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    lineHeight: 1.15,
    marginBottom: 4,
  },
  companyTrade: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  companyDetails: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.55,
  },
  headerRight: {
    width: 200,
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  invoiceNumberBox: {
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    alignItems: "flex-end",
  },
  invoiceNumberLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 13,
    fontFamily: "Courier-Bold",
    color: TEXT_DARK,
  },

  /* Meta row */
  metaRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    paddingRight: 10,
  },
  infoBoxLast: {
    paddingRight: 0,
  },
  infoLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 10,
    color: TEXT_DARK,
  },
  infoSub: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 1.5,
  },

  /* Customer row */
  customerRow: {
    flexDirection: "row",
    marginBottom: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  customerBox: {
    flex: 1,
    paddingRight: 12,
  },
  customerBoxLast: {
    paddingRight: 0,
  },

  /* Line items table */
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_BLUE,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  tableHeaderText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: "#FAFBFD",
  },
  tableCell: {
    fontSize: 9,
    color: TEXT_DARK,
  },
  colLine:    { width: 20,  textAlign: "left" },
  colItem:    { width: 52,  textAlign: "left" },
  colDesc:    { flex: 1,    textAlign: "left",  paddingRight: 6, paddingLeft: 6 },
  colNum:     { width: 46,  textAlign: "right", paddingRight: 6, paddingLeft: 4 },
  colSmall:   { width: 44,  textAlign: "right", paddingRight: 6, paddingLeft: 4 },
  colVat:     { width: 46,  textAlign: "left",  paddingRight: 6, paddingLeft: 6 },
  colSvc:     { width: 26,  textAlign: "center" },
  colTotal:   { width: 66,  textAlign: "right", paddingRight: 2, paddingLeft: 6, fontFamily: "Courier-Bold" },

  /* Totals */
  totalsBlock: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  totalsTable: {
    width: 240,
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 9.5,
    color: TEXT_MUTED,
  },
  totalsValue: {
    fontSize: 9.5,
    fontFamily: "Courier",
    textAlign: "right",
    color: TEXT_DARK,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_BLUE,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    letterSpacing: 0.4,
  },
  grandTotalValue: {
    fontSize: 15,
    fontFamily: "Courier-Bold",
    textAlign: "right",
    color: BRAND_BLUE,
  },

  /* Sections */
  section: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.55,
  },

  /* How to Pay card */
  payCard: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
  },
  payMethodName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT_DARK,
    marginBottom: 3,
  },
  payPreferredStar: {
    color: BRAND_BLUE,
    fontFamily: "Helvetica-Bold",
  },
  payDetail: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.55,
  },
  payReferenceBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  payReferenceLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
  },
  payReferenceValue: {
    fontSize: 9,
    fontFamily: "Courier-Bold",
    color: TEXT_DARK,
  },

  /* QR */
  qrBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: LIGHT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_BLUE,
    borderRadius: 4,
    marginTop: 16,
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    marginRight: 12,
    borderRadius: 3,
  },

  /* Footer */
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BRAND_BLUE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 7.5,
    color: TEXT_MUTED,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  paymentMethods?: PaymentMethod[];
}

export function InvoicePDF({ invoice, paymentMethods = [] }: InvoicePDFProps) {
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);

  useEffect(() => {
    const verifiable =
      invoice.status_code === "approved" || invoice.status_code === "paid";
    if (!verifiable || !invoice.verify_token) {
      setQrDataUri(null);
      return;
    }
    const base =
      import.meta.env.VITE_VERIFY_BASE_URL || "http://localhost:5173/verify";
    const url = `${base}/${invoice.verify_token}`;
    QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUri)
      .catch(() => setQrDataUri(null));
  }, [invoice.status_code, invoice.verify_token]);

  // Seller info: always from the invoice snapshot (single source of truth).
  const sellerName = invoice.seller_name_snapshot || "-";
  const sellerTrade = invoice.seller_trading_name_snapshot;
  const sellerTin = invoice.seller_tin_snapshot;
  const sellerVat = invoice.seller_vat_number_snapshot;
  const sellerAddress = invoice.seller_address_snapshot;

  // Date & time line - fall back to issue_date if issued_at is missing (old invoices).
  const dateTimeText = invoice.issued_at
    ? formatDateTimeSAST(invoice.issued_at)
    : formatDateOnly(invoice.issue_date);

  const badge = statusStyle(invoice.status_code);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccent} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.initialBadge}>
              <Text style={styles.initialBadgeText}>{initials(sellerName)}</Text>
            </View>
            <View style={styles.headerLeftText}>
              <Text style={styles.companyName}>{sellerName}</Text>
              {sellerTrade && <Text style={styles.companyTrade}>{sellerTrade}</Text>}
              <View style={styles.companyDetails}>
                {sellerTin && <Text>TIN: {sellerTin}</Text>}
                {sellerVat && <Text>VAT: {sellerVat}</Text>}
                {sellerAddress && <Text>{sellerAddress}</Text>}
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>FISCAL TAX INVOICE</Text>
            <View style={styles.invoiceNumberBox}>
              <Text style={styles.invoiceNumberLabel}>INVOICE NO.</Text>
              <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            </View>
            {invoice.status_name && (
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  color: badge.fg,
                  backgroundColor: badge.bg,
                  borderRadius: 3,
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  alignSelf: "flex-end",
                  letterSpacing: 0.5,
                }}
              >
                {invoice.status_name.toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Date &amp; Time</Text>
            <Text style={styles.infoValue}>{dateTimeText}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>
              {invoice.due_date ? formatDateOnly(invoice.due_date) : "Upon receipt"}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Fiscal Period</Text>
            <Text style={styles.infoValue}>
              {invoice.fiscal_period_name_snapshot ?? "-"}
            </Text>
          </View>
          <View style={[styles.infoBox, styles.infoBoxLast]}>
            <Text style={styles.infoLabel}>Created By</Text>
            <Text style={styles.infoValue}>
              {invoice.created_by_name_snapshot ?? "-"}
            </Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.customerRow}>
          <View style={styles.customerBox}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={[styles.infoValue, { marginTop: 3 }]}>
              {invoice.customer_name_snapshot || "-"}
            </Text>
            {invoice.customer_trading_name_snapshot && (
              <Text style={styles.infoSub}>{invoice.customer_trading_name_snapshot}</Text>
            )}
            {invoice.customer_tin_snapshot && (
              <Text style={styles.infoSub}>TIN: {invoice.customer_tin_snapshot}</Text>
            )}
            {invoice.customer_vat_number_snapshot && (
              <Text style={styles.infoSub}>VAT: {invoice.customer_vat_number_snapshot}</Text>
            )}
            {invoice.customer_address_snapshot && (
              <Text style={styles.infoSub}>{invoice.customer_address_snapshot}</Text>
            )}
          </View>
          <View style={[styles.customerBox, styles.customerBoxLast]}>
            <Text style={styles.infoLabel}>Customer Reference</Text>
            <Text style={[styles.infoValue, { marginTop: 3 }]}>
              {invoice.reference || "-"}
            </Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colLine]}>#</Text>
          <Text style={[styles.tableHeaderText, styles.colItem]}>Item #</Text>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colNum]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colNum]}>Price</Text>
          <Text style={[styles.tableHeaderText, styles.colSmall]}>Disc</Text>
          <Text style={[styles.tableHeaderText, styles.colVat]}>VAT</Text>
          <Text style={[styles.tableHeaderText, styles.colSmall]}>VAT Amt</Text>
          <Text style={[styles.tableHeaderText, styles.colSvc]}>Svc</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {invoice.items.map((it, idx) => (
          <View
            key={it.id}
            style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.tableCell, styles.colLine]}>{it.line_number}</Text>
            <Text style={[styles.tableCell, styles.colItem]}>
              {it.item_number || "-"}
            </Text>
            <Text style={[styles.tableCell, styles.colDesc]}>{it.description}</Text>
            <Text style={[styles.tableCell, styles.colNum]}>
              {Number(it.quantity).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.colNum]}>
              {Number(it.unit_price).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.colSmall]}>
              {Number(it.discount_amount).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.colVat]}>
              {it.tax_code_snapshot || "-"}
            </Text>
            <Text style={[styles.tableCell, styles.colSmall]}>
              {Number(it.line_tax).toFixed(2)}
            </Text>
            <Text style={[styles.tableCell, styles.colSvc]}>
              {it.is_service ? "Y" : ""}
            </Text>
            <Text style={[styles.tableCell, styles.colTotal]}>
              {Number(it.line_total).toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {Number(invoice.subtotal).toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT</Text>
              <Text style={styles.totalsValue}>
                {Number(invoice.tax_total).toFixed(2)}
              </Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Invoice Total</Text>
              <Text style={styles.grandTotalValue}>
                {Number(invoice.total).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* How to Pay */}
        {paymentMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How to Pay</Text>
            <View style={styles.payCard}>
              {paymentMethods.map((m, idx) => (
                <View
                  key={m.id}
                  style={{ marginBottom: idx < paymentMethods.length - 1 ? 10 : 0 }}
                >
                  <Text style={styles.payMethodName}>
                    {m.is_preferred && (
                      <Text style={styles.payPreferredStar}>{"\u2605 "}</Text>
                    )}
                    {m.display_name}
                  </Text>
                  {Object.entries(m.details || {}).map(([key, value]) => (
                    <Text key={key} style={styles.payDetail}>
                      {key.replace(/_/g, " ")}: {String(value || "\u2014")}
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.payReferenceBlock}>
                <Text style={styles.payReferenceLabel}>Reference</Text>
                <Text style={styles.payReferenceValue}>
                  {invoice.invoice_number}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* QR */}
        {(invoice.status_code === "approved" || invoice.status_code === "paid") && (
          <View style={styles.qrBlock}>
            {qrDataUri ? (
              <Image
                src={qrDataUri}
                style={{ width: 60, height: 60, marginRight: 12 }}
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={{ fontSize: 6, color: TEXT_MUTED, textAlign: "center" }}>
                  QR{"\n"}loading...
                </Text>
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: "Helvetica-Bold",
                  fontSize: 9,
                  color: TEXT_DARK,
                  marginBottom: 4,
                  lineHeight: 1.4,
                }}
              >
                Scan to verify this invoice
              </Text>
              <Text style={{ fontSize: 8, color: TEXT_MUTED, lineHeight: 1.5 }}>
                This QR code links to a public verification page confirming the invoice details. It is not yet an RSL fiscal receipt.
              </Text>
            </View>
          </View>
        )}

        {/* Notes / Terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.section}>
            {invoice.notes && (
              <View>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.sectionBody}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.terms && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sectionTitle}>Terms</Text>
                <Text style={styles.sectionBody}>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{sellerName} - Generated by MalutiRecon</Text>
          <Text>
            {invoice.invoice_number} - {formatDateOnly(invoice.issue_date)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
