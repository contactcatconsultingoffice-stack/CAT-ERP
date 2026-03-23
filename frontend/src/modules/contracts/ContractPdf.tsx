import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import type { ReactNode } from 'react';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  section: {
    marginBottom: 12
  },
  terms: {
    whiteSpace: 'pre'
  }
});

type Props = {
  title: string;
  summaryLines: ReactNode;
  rawText: string;
};

export function ContractPdf({ title, summaryLines, rawText }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text>CAT Consulting</Text>
        </View>

        <View style={styles.section}>{summaryLines}</View>

        <View>
          <Text style={styles.terms}>{rawText}</Text>
        </View>
      </Page>
    </Document>
  );
}

