const pdfmake = require('pdfmake');
pdfmake.setFonts({
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
});

async function run() {
  const docDefinition = {
    content: [ 'First paragraph', 'Another paragraph' ]
  };
  const doc = pdfmake.createPdf(docDefinition);
  const buf = await doc.getBuffer();
  console.log("Buffer created! size:", buf.length);
}
run().catch(console.error);
