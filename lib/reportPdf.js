const clean = (s) => String(s == null ? '' : s).replace(/’/g, "'")

export async function makePdf(spec, fileName) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.text(clean(spec.title), 14, 14)
  doc.setFontSize(10)
  doc.text(clean(spec.bar), 14, 20)
  doc.text(clean(spec.period), 14, 25)
  doc.text(clean(spec.generated), 14, 30)
  autoTable(doc, {
    startY: 35,
    head: [[clean(spec.summaryTitle), '']],
    body: spec.summary.map((r) => [clean(r[0]), clean(r[1])]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })
  let cursor = doc.lastAutoTable.finalY
  for (const sec of spec.sections) {
    let y = cursor + 10
    if (y > 185) {
      doc.addPage()
      y = 16
    }
    doc.setFontSize(12)
    doc.text(clean(sec.title), 14, y)
    if (sec.body.length === 0) {
      doc.setFontSize(9)
      doc.text(clean(spec.empty), 14, y + 6)
      cursor = y + 6
      continue
    }
    autoTable(doc, {
      startY: y + 3,
      head: [sec.head.map(clean)],
      body: sec.body.map((r) => r.map(clean)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 14, right: 14 },
    })
    cursor = doc.lastAutoTable.finalY
    if (sec.note) {
      doc.setFontSize(8)
      doc.text(clean(sec.note), 14, cursor + 5)
      cursor += 5
    }
  }
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(i + ' / ' + pages, 283, 205, { align: 'right' })
  }
  doc.save(fileName + '.pdf')
}
