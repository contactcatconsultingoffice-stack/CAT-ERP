import { TDocumentDefinitions } from 'pdfmake/interfaces';
import * as fs from 'fs';
import * as path from 'path';

const pdfmake = require('pdfmake');

pdfmake.setFonts({
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});

// Load the CAT Consulting logo as base64 for embedding in PDFs
const LOGO_PATH = path.join(__dirname, '../assets/images/Logo moderne de CAT Consulting.png');
let LOGO_BASE64: string | null = null;
try {
  const logoBuffer = fs.readFileSync(LOGO_PATH);
  LOGO_BASE64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
} catch {
  console.warn('[PDF] Logo not found at', LOGO_PATH, '— PDFs will be generated without logo.');
}

// Shared header builder with logo + company name
function buildHeader(title: string): any[] {
  const header: any[] = [
    {
      columns: [
        LOGO_BASE64
          ? { image: LOGO_BASE64, width: 120, margin: [0, 0, 0, 0] }
          : { text: 'CAT Consulting', bold: true, fontSize: 16, color: '#2563eb' },
        {
          stack: [
            { text: title, style: 'header' },
            { text: `Généré le : ${new Date().toLocaleDateString('fr-FR')}`, style: 'subheader' },
          ],
          alignment: 'right',
        }
      ],
      margin: [0, 0, 0, 20]
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#2563eb' }], margin: [0, 0, 0, 20] }
  ];
  return header;
}

const sharedStyles: TDocumentDefinitions['styles'] = {
  header: {
    fontSize: 16,
    bold: true,
    color: '#2563eb'
  },
  subheader: {
    fontSize: 9,
    color: '#64748b',
    margin: [0, 2, 0, 0]
  },
  tableHeader: {
    bold: true,
    fontSize: 10,
    color: 'white',
    fillColor: '#2563eb',
    margin: [5, 4, 5, 4]
  }
};

export const generateProjectListPDF = async (projects: any[]): Promise<Buffer> => {
  const docDefinition: TDocumentDefinitions = {
    content: [
      ...buildHeader('Liste des Projets'),
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Référence', style: 'tableHeader' },
              { text: 'Nom du Projet', style: 'tableHeader' },
              { text: 'Client', style: 'tableHeader' },
              { text: 'Statut', style: 'tableHeader' },
              { text: 'Priorité', style: 'tableHeader' }
            ],
            ...projects.map(p => [
              { text: p.reference || 'N/A', fontSize: 9 },
              { text: p.name, fontSize: 9 },
              { text: p.client?.name || 'N/A', fontSize: 9 },
              { text: p.status, fontSize: 9 },
              { text: p.priority, fontSize: 9 }
            ])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ],
    styles: sharedStyles,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10
    },
    pageMargins: [40, 40, 40, 40]
  };

  const pdfDocument = pdfmake.createPdf(docDefinition);
  return await pdfDocument.getBuffer();
};

export const generateClientListPDF = async (clients: any[]): Promise<Buffer> => {
  const docDefinition: TDocumentDefinitions = {
    content: [
      ...buildHeader('Annuaire Clients'),
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', '*', 'auto'],
          body: [
            [
              { text: 'Nom du Client', style: 'tableHeader' },
              { text: 'Contact', style: 'tableHeader' },
              { text: 'Email', style: 'tableHeader' },
              { text: 'Téléphone', style: 'tableHeader' }
            ],
            ...clients.map(c => [
              { text: c.name, fontSize: 9 },
              { text: c.contact || 'N/A', fontSize: 9 },
              { text: c.email || 'N/A', fontSize: 9 },
              { text: c.phone || 'N/A', fontSize: 9 }
            ])
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ],
    styles: sharedStyles,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10
    },
    pageMargins: [40, 40, 40, 40]
  };

  const pdfDocument = pdfmake.createPdf(docDefinition);
  return await pdfDocument.getBuffer();
};
