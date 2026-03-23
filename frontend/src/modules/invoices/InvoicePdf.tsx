import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';

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
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  section: {
    marginBottom: 12
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 4
  },
  th: {
    flex: 3
  },
  thSmall: {
    flex: 1,
    textAlign: 'right'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2
  },
  cellDesc: {
    flex: 3
  },
  cell: {
    flex: 1,
    textAlign: 'right'
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  terms: {
    marginTop: 8,
    whiteSpace: 'pre'
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
  const subtotal = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );
  const tax = taxAmount !== undefined ? taxAmount : 0;
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>CAT Consulting</Text>
            <Text>Tunis, Tunisie</Text>
          </View>
          <View>
            <Text>DEVIS</Text>
            <Text>N° {quoteNumber}</Text>
            <Text>Date : {quoteDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Destinataire</Text>
          <Text>{clientName}</Text>
        </View>

        <View style={styles.section}>
          <Text>Résumé</Text>
          <Text>{summary}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.th}>Description</Text>
            <Text style={styles.thSmall}>PU ({currency})</Text>
            <Text style={styles.thSmall}>Qté</Text>
            <Text style={styles.thSmall}>Total ({currency})</Text>
          </View>
          {lines.map(line => (
            <View key={line.id} style={styles.row}>
              <Text style={styles.cellDesc}>{line.description}</Text>
              <Text style={styles.cell}>
                {line.unitPrice.toFixed(2)}
              </Text>
              <Text style={styles.cell}>{line.quantity}</Text>
              <Text style={styles.cell}>
                {(line.unitPrice * line.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsRow}>
          <View>
            <Text>
              Subtotal: {subtotal.toFixed(2)} {currency}
            </Text>
            <Text>
              TVA: {tax.toFixed(2)} {currency}
            </Text>
            <Text>
              Total: {total.toFixed(2)} {currency}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Conditions de paiement</Text>
          <Text style={styles.terms}>{paymentTerms}</Text>
        </View>
      </Page>
    </Document>
  );
}

