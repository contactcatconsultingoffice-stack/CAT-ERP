const { generateProjectListPDF } = require('./dist/utils/export-pdf');

async function test() {
  try {
    const projects = [
      { reference: 'PRJ-001', name: 'Test Project', client: { name: 'Client A' }, status: 'PLANNING', priority: 'HIGH' }
    ];
    console.log('Generating PDF...');
    const buffer = await generateProjectListPDF(projects);
    console.log('PDF Generated, buffer length:', buffer.length);
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

test();
