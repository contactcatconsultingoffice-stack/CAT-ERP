import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer';

// Import logo — placed in frontend/src/assets/images/
import catLogo from '../../assets/images/Logo moderne de CAT Consulting.png';

type InvoiceLine = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type Props = {
  clientName: string;
  summary: string;
  currency: string;
  quoteNumber: string;
  quoteDate: string;
  lines: InvoiceLine[];
  paymentTerms: string;
  taxAmount?: number;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1e293b'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  logo: {
    width: 100,
    height: 50
  },
  docBlock: {
    alignItems: 'flex-end'
  },
  docType: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb'
  },
  docRef: {
    fontSize: 9,
    color: '#475569',
    marginTop: 3
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    marginVertical: 12
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  clientNameStyle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  summaryText: {
    fontSize: 9,
    color: '#334155',
    marginTop: 4
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 1
  },
  thDesc: { flex: 4, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  thNum:  { flex: 1, color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0'
  },
  tdDesc: { flex: 4, fontSize: 9, color: '#334155' },
  tdNum:  { flex: 1, fontSize: 9, color: '#334155', textAlign: 'right' },
  totalsBox: {
    alignItems: 'flex-end',
    marginTop: 16
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 3
  },
  totalLabel: { fontSize: 9, color: '#64748b' },
  totalValue: { fontSize: 9, color: '#334155', fontFamily: 'Helvetica-Bold' },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#2563eb',
    marginTop: 4
  },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  termsSection: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0'
  },
  termsText: {
    fontSize: 8,
    color: '#64748b'
  }
});

export function InvoicePdf({
  clientName,
  summary,
  currency,
  quoteNumber,
  quoteDate,
  lines,
  paymentTerms,
  taxAmount
}: Props) {
  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const tax = taxAmount !== undefined ? taxAmount : 0;
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Image src={catLogo} style={styles.logo} />
          <View style={styles.docBlock}>
            <Text style={styles.docType}>DEVIS</Text>
            <Text style={styles.docRef}>N° {quoteNumber}</Text>
            <Text style={styles.docRef}>Date : {quoteDate}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* ── Client + Résumé ── */}
        <View style={styles.twoCol}>
          <View>
            <Text style={styles.sectionLabel}>Destinataire</Text>
            <Text style={styles.clientNameStyle}>{clientName}</Text>
          </View>
          <View style={{ maxWidth: 250 }}>
            <Text style={styles.sectionLabel}>Objet</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        </View>

        {/* ── Ligne en-tête ── */}
        <View style={styles.tableHeader}>
          <Text style={styles.thDesc}>Description</Text>
          <Text style={styles.thNum}>PU ({currency})</Text>
          <Text style={styles.thNum}>Qté</Text>
          <Text style={styles.thNum}>Total ({currency})</Text>
        </View>

        {/* ── Lignes ── */}
        {lines.map((line, idx) => (
          <View key={line.id ?? idx} style={styles.tableRow}>
            <Text style={styles.tdDesc}>{line.description || '-'}</Text>
            <Text style={styles.tdNum}>{Number(line.unitPrice || 0).toFixed(2)}</Text>
            <Text style={styles.tdNum}>{Number(line.quantity || 0)}</Text>
            <Text style={styles.tdNum}>{(Number(line.unitPrice || 0) * Number(line.quantity || 0)).toFixed(2)}</Text>
          </View>
        ))}

        {/* ── Totaux ── */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total ({currency})</Text>
            <Text style={styles.totalValue}>{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA</Text>
            <Text style={styles.totalValue}>{tax.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandLabel}>Total ({currency})</Text>
            <Text style={styles.grandValue}>{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Conditions de paiement ── */}
        <View style={styles.termsSection}>
          <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>Conditions de paiement</Text>
          <Text style={styles.termsText}>{paymentTerms}</Text>
        </View>

      </Page>
    </Document>
  );
}
