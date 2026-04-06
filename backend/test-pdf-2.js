const PdfPrinter = require('pdfmake/js/Printer').default;

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

const docDefinition = {
  content: [ 'First paragraph', 'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines' ]
};

try {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  console.log("pdfDoc type:", typeof pdfDoc);
  console.log("pdfDoc methods:", Object.keys(pdfDoc).filter(k => typeof pdfDoc[k] === 'function'));
  console.log("Has on?", typeof pdfDoc.on === 'function');
  
  if (typeof pdfDoc.on === 'function') {
      let chunks = [];
      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => console.log('Buffer length:', Buffer.concat(chunks).length));
  } else {
      console.log('No on method!');
  }
  pdfDoc.end();
} catch (e) {
  console.error(e);
}
