import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from '@react-pdf/renderer';

import catLogo from '../../assets/images/Logo moderne de CAT Consulting.png';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InvoiceLine = {
  id: number;
  description: string;
  subDescription?: string;
  quantity: number;
  unitPrice: number;
  unitLabel?: string; // e.g. 'jour', 'heure'
};

export type InvoiceProps = {
  // Document meta
  kind: 'FACTURE' | 'DEVIS';
  docNumber: string;
  issuedAt: string;      // e.g. "08 Avril 2026"
  dueOrValidUntil: string; // échéance (facture) or validité (devis)

  // Our company
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  siret?: string;
  tvaIntra?: string;
  capital?: string;
  rcs?: string;

  // Client
  clientName: string;
  clientAttention?: string;
  clientAddress?: string;
  clientCity?: string;
  clientTVA?: string;

  // Project
  projectRef?: string;
  consultant?: string;

  // Lines
  lines: InvoiceLine[];

  // Financials
  currency: string;
  taxRate?: number; // percentage, e.g. 20 → 20%
  taxAmount?: number; // override if you pass a fixed amount

  // Payment / Legal
  bankName?: string;
  bankHolder?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string; // legal & late payment info
  legalMentions?: string;
};

// ─── Brand colour ─────────────────────────────────────────────────────────────
const BRAND = '#1e3a8a';
const BRAND_LIGHT = '#dbeafe';
const GRAY_100 = '#f8fafc';
const GRAY_200 = '#e2e8f0';
const GRAY_400 = '#94a3b8';
const GRAY_600 = '#475569';
const GRAY_800 = '#1e293b';
const WHITE = '#ffffff';

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    paddingVertical: 36,
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: GRAY_800,
    backgroundColor: WHITE,
  },

  /* ── HEADER ── */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    marginBottom: 16,
  },
  logo: { width: 90, height: 40, objectFit: 'contain' },
  companyBlock: { marginTop: 6 },
  companyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GRAY_800, marginBottom: 2 },
  companyDetail: { fontSize: 8, color: GRAY_600, lineHeight: 1.5 },

  docBlock: { alignItems: 'flex-end' },
  docType: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: BRAND, letterSpacing: 1 },
  docRef: { fontSize: 8.5, color: GRAY_600, marginTop: 4 },
  docRefBold: { fontFamily: 'Helvetica-Bold', color: GRAY_800 },
  docDate: { fontSize: 8.5, color: GRAY_600, marginTop: 2 },

  /* ── CLIENT SECTION ── */
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: GRAY_100,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: GRAY_200,
    padding: 14,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: GRAY_800, marginBottom: 3 },
  clientDetail: { fontSize: 8, color: GRAY_600, lineHeight: 1.5 },
  projectDetail: { fontSize: 8, color: GRAY_600, lineHeight: 1.7 },
  projectDetailBold: { fontFamily: 'Helvetica-Bold', color: GRAY_800 },

  /* ── TABLE ── */
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: { color: WHITE, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  thDesc: { flex: 5 },
  thCenter: { width: 56, textAlign: 'center' },
  thRight: { width: 72, textAlign: 'right' },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
  },
  tableRowAlt: { backgroundColor: '#f1f5f9' },
  tdDesc: { flex: 5 },
  tdDescTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GRAY_800 },
  tdDescSub: { fontSize: 7.5, color: GRAY_400, marginTop: 1.5 },
  tdCenter: { width: 56, textAlign: 'center', fontSize: 8.5, color: GRAY_600 },
  tdRight: { width: 72, textAlign: 'right', fontSize: 8.5, color: GRAY_600 },
  tdTotal: { width: 72, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GRAY_800 },

  /* ── TOTALS ── */
  totalsWrapper: { alignItems: 'flex-end', marginTop: 14, marginBottom: 20 },
  totalsBox: { width: 200 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
  },
  totalLabel: { fontSize: 8.5, color: GRAY_600 },
  totalValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GRAY_800 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: BRAND,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    marginTop: 4,
  },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND },

  /* ── FOOTER SECTION ── */
  footerDivider: {
    borderTopWidth: 0.5,
    borderTopColor: GRAY_200,
    marginTop: 16,
    paddingTop: 14,
  },
  footerRow: { flexDirection: 'row', gap: 20 },
  footerCol: { flex: 1 },
  footerTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: GRAY_800,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  footerText: { fontSize: 7.5, color: GRAY_600, lineHeight: 1.6 },
  footerBold: { fontFamily: 'Helvetica-Bold', color: GRAY_600 },

  /* ── SIGNATURE (Devis only) ── */
  signatureSection: {
    marginTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_200,
    paddingTop: 12,
  },
  signatureNote: { fontSize: 8, color: GRAY_600, fontStyle: 'italic', marginBottom: 10 },
  signatureRow: { flexDirection: 'row', gap: 16 },
  signatureBox: {
    flex: 1,
    height: 80,
    borderWidth: 1.5,
    borderColor: GRAY_200,
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureBoxLabel: { fontSize: 7.5, color: GRAY_400 },

  legalMentions: { fontSize: 6.5, color: GRAY_400, textAlign: 'center', marginTop: 14, lineHeight: 1.5 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePdf(props: InvoiceProps) {
  const {
    kind = 'FACTURE',
    docNumber,
    issuedAt,
    dueOrValidUntil,
    companyName = 'CAT Consulting',
    companyAddress = '123 Avenue de la République',
    companyCity = 'Conakry, Guinée',
    companyPhone,
    companyEmail,
    companyWebsite,
    siret,
    tvaIntra,
    capital,
    rcs,
    clientName,
    clientAttention,
    clientAddress,
    clientCity,
    clientTVA,
    projectRef,
    consultant,
    lines,
    currency,
    taxRate,
    taxAmount: taxAmountProp,
    bankName,
    bankHolder,
    iban,
    bic,
    paymentTerms,
    legalMentions,
  } = props;

  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0
  );

  const taxAmount =
    taxAmountProp !== undefined
      ? taxAmountProp
      : taxRate !== undefined
        ? (subtotal * taxRate) / 100
        : 0;

  const total = subtotal + taxAmount;

  const dueLabelKey = kind === 'FACTURE' ? "Date d'échéance :" : 'Valable jusqu\'au :';

  const defaultLegal = `${companyName}${capital ? ` au capital de ${capital}` : ''}${siret ? ` — N° SIRET : ${siret}` : ''}${rcs ? ` — RCS ${rcs}` : ''}${tvaIntra ? ` — N° TVA Intra : ${tvaIntra}` : ''}`;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ══════════ HEADER ══════════ */}
        <View style={s.headerRow}>
          {/* Left — company info */}
          <View>
            <Image src={catLogo} style={s.logo} />
            <View style={s.companyBlock}>
              <Text style={s.companyName}>{companyName}</Text>
              <Text style={s.companyDetail}>{companyAddress}</Text>
              <Text style={s.companyDetail}>{companyCity}</Text>
              {companyPhone && <Text style={s.companyDetail}>Tél : {companyPhone}</Text>}
              {companyEmail && <Text style={s.companyDetail}>Email : {companyEmail}</Text>}
              {companyWebsite && <Text style={s.companyDetail}>{companyWebsite}</Text>}
            </View>
          </View>

          {/* Right — document title & meta */}
          <View style={s.docBlock}>
            <Text style={s.docType}>{kind}</Text>
            <Text style={s.docRef}>
              <Text style={s.docRefBold}>N° </Text>{docNumber}
            </Text>
            <Text style={s.docDate}>
              <Text style={s.docRefBold}>Date d'émission : </Text>{issuedAt}
            </Text>
            <Text style={s.docDate}>
              <Text style={s.docRefBold}>{dueLabelKey} </Text>{dueOrValidUntil}
            </Text>
          </View>
        </View>

        {/* ══════════ CLIENT SECTION ══════════ */}
        <View style={s.clientSection}>
          <View>
            <Text style={s.sectionLabel}>{kind === 'FACTURE' ? 'Facturé à / Client :' : 'Devis établi pour :'}</Text>
            <Text style={s.clientName}>{clientName}</Text>
            {clientAttention && <Text style={s.clientDetail}>À l'attention de {clientAttention}</Text>}
            {clientAddress && <Text style={s.clientDetail}>{clientAddress}</Text>}
            {clientCity && <Text style={s.clientDetail}>{clientCity}</Text>}
            {clientTVA && <Text style={s.clientDetail}>N° TVA : {clientTVA}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.sectionLabel}>Détails du Projet :</Text>
            {projectRef && (
              <Text style={s.projectDetail}>
                <Text style={s.projectDetailBold}>Référence : </Text>{projectRef}
              </Text>
            )}
            {consultant && (
              <Text style={s.projectDetail}>
                <Text style={s.projectDetailBold}>Consultant : </Text>{consultant}
              </Text>
            )}
          </View>
        </View>

        {/* ══════════ TABLE ══════════ */}
        <View>
          {/* Header row */}
          <View style={s.tableHeader}>
            <Text style={[s.th, s.thDesc]}>Description de la prestation</Text>
            <Text style={[s.th, s.thCenter]}>Qté / Jours</Text>
            <Text style={[s.th, s.thRight]}>Prix unitaire</Text>
            <Text style={[s.th, s.thRight]}>Total HT</Text>
          </View>

          {/* Data rows */}
          {lines.map((line, idx) => {
            const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
            const isAlt = idx % 2 === 1;
            return (
              <View key={line.id ?? idx} style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}>
                <View style={s.tdDesc}>
                  <Text style={s.tdDescTitle}>{line.description || '-'}</Text>
                  {line.subDescription && <Text style={s.tdDescSub}>{line.subDescription}</Text>}
                </View>
                <Text style={s.tdCenter}>
                  {Number(line.quantity || 0).toFixed(1)}{line.unitLabel ? `\n${line.unitLabel}` : ''}
                </Text>
                <Text style={s.tdRight}>
                  {Number(line.unitPrice || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
                </Text>
                <Text style={s.tdTotal}>{fmt(lineTotal, currency)}</Text>
              </View>
            );
          })}
        </View>

        {/* ══════════ TOTALS ══════════ */}
        <View style={s.totalsWrapper}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Hors Taxes (HT)</Text>
              <Text style={s.totalValue}>{fmt(subtotal, currency)}</Text>
            </View>
            {(taxRate !== undefined || taxAmountProp !== undefined) && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>TVA {taxRate !== undefined ? `(${taxRate}%)` : ''}</Text>
                <Text style={s.totalValue}>{fmt(taxAmount, currency)}</Text>
              </View>
            )}
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Net à payer (TTC)</Text>
              <Text style={s.grandValue}>{fmt(total, currency)}</Text>
            </View>
          </View>
        </View>

        {/* ══════════ FOOTER — Payment + Legal ══════════ */}
        <View style={s.footerDivider}>
          <View style={s.footerRow}>
            {/* Bank details */}
            {(bankName || iban) && (
              <View style={s.footerCol}>
                <Text style={s.footerTitle}>Informations de Paiement</Text>
                {bankName && (
                  <Text style={s.footerText}>
                    <Text style={s.footerBold}>Banque : </Text>{bankName}
                  </Text>
                )}
                {bankHolder && (
                  <Text style={s.footerText}>
                    <Text style={s.footerBold}>Titulaire : </Text>{bankHolder}
                  </Text>
                )}
                {iban && (
                  <Text style={s.footerText}>
                    <Text style={s.footerBold}>IBAN : </Text>{iban}
                  </Text>
                )}
                {bic && (
                  <Text style={s.footerText}>
                    <Text style={s.footerBold}>BIC / SWIFT : </Text>{bic}
                  </Text>
                )}
              </View>
            )}

            {/* Payment terms / legal */}
            <View style={s.footerCol}>
              <Text style={s.footerTitle}>Conditions & Mentions légales</Text>
              <Text style={s.footerText}>
                {paymentTerms ||
                  "En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera appliquée. Une indemnité forfaitaire de 40€ sera due."}
              </Text>
            </View>
          </View>
        </View>

        {/* ══════════ SIGNATURE (Devis only) ══════════ */}
        {kind === 'DEVIS' && (
          <View style={s.signatureSection}>
            <Text style={s.signatureNote}>
              Bon pour accord — Signature et cachet de l'entreprise :
            </Text>
            <View style={s.signatureRow}>
              <View style={s.signatureBox}>
                <Text style={s.signatureBoxLabel}>Zone de signature (Client)</Text>
              </View>
              <View style={s.signatureBox}>
                <Text style={s.signatureBoxLabel}>Zone de signature (Cabinet)</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════ LEGAL FOOTER LINE ══════════ */}
        <Text style={s.legalMentions}>
          {legalMentions || defaultLegal}
        </Text>

      </Page>
    </Document>
  );
}
