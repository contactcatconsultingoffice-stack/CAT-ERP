import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Use require for pdfmake due to type definition inconsistences with constructability
const PdfPrinter = require('pdfmake/js/printer').default;

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export const generateProjectListPDF = (projects: any[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'CAT Consulting Office - Liste des Projets', style: 'header' },
        { text: `Généré le : ${new Date().toLocaleDateString('fr-FR')}`, style: 'subheader' },
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
                p.reference || 'N/A',
                p.name,
                p.client?.name || 'N/A',
                p.status,
                p.priority
              ])
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
          color: '#2563eb'
        },
        subheader: {
          fontSize: 10,
          margin: [0, 0, 0, 20],
          color: '#64748b'
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: 'white',
          fillColor: '#2563eb',
          margin: [5, 2, 5, 2]
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10
      }
    };

    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: any[] = [];
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};
export const generateClientListPDF = (clients: any[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'CAT Consulting Office - Annuaire Clients', style: 'header' },
        { text: `Généré le : ${new Date().toLocaleDateString('fr-FR')}`, style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Nom du Client', style: 'tableHeader' },
                { text: 'Contact', style: 'tableHeader' },
                { text: 'Email', style: 'tableHeader' },
                { text: 'Type', style: 'tableHeader' }
              ],
              ...clients.map(c => [
                c.name,
                c.contact || 'N/A',
                c.email || 'N/A',
                c.type || 'N/A'
              ])
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
          color: '#2563eb'
        },
        subheader: {
          fontSize: 10,
          margin: [0, 0, 0, 20],
          color: '#64748b'
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: 'white',
          fillColor: '#2563eb',
          margin: [5, 2, 5, 2]
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10
      }
    };

    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: any[] = [];
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};
