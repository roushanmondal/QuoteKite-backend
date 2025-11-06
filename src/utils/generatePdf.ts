import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import imageSize from 'image-size'
import { parseMarkdownSections } from '../services/quoteService'
import { formatDate } from '../services/quoteService'

export const generateDraftPdf = (
  content: string,
  companyProfile: any,
  logoBuffer?: Buffer,
  sitePhotoBuffer?: Buffer,
  sitePhotoUrl?: string | null
): Buffer => {
  const doc = new jsPDF()
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // --- Define Colors & Helpers ---
  const primaryColor = '#4E9784'
  const textColor = '#333333'
  const checkPageBreak = (spaceNeeded: number) => {
    if (cursor + spaceNeeded > pageHeight - margin) {
      doc.addPage()
      cursor = 20
    }
  }

  // --- Header ---
  const headerY = 15
  let headerBottomY = 0
  // Draw Company Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(textColor)
  doc.text(companyProfile?.name || 'Your Company', margin, headerY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const infoY = headerY + 12
  const lineHeight = 5
  doc.text(companyProfile?.address || '', margin, headerY + 12)
  doc.text(companyProfile?.phone || '', margin, infoY + lineHeight)
  doc.text(companyProfile?.email || '', margin, infoY + lineHeight * 2)
  doc.text(companyProfile?.website || '', margin, infoY + lineHeight * 3)

  // Calculate the bottom of the text block
  headerBottomY = infoY + lineHeight * 3

  // Draw Logo
  if (logoBuffer) {
    try {
      const dimensions = imageSize(logoBuffer)
      const aspectRatio = dimensions.height! / dimensions.width!
      const desiredWidth = 40
      const calculatedHeight = desiredWidth * aspectRatio
      const logoExtension = companyProfile.logoUrl.split('.').pop()?.toUpperCase() || 'PNG'

      // 2. Draw the logo relative to the fixed headerY
      const logoY = headerY - 5
      doc.addImage(logoBuffer, logoExtension, pageWidth - margin - desiredWidth, logoY, desiredWidth, calculatedHeight)

      // Update the header's bottom position if the logo is taller
      if (logoY + calculatedHeight > headerBottomY) {
        headerBottomY = logoY + calculatedHeight
      }
    } catch (error) {
      console.error('Could not add logo.', error)
    }
  }
  // 3. Set the main cursor for the rest of the document below the tallest header element
  let cursor = headerBottomY + 15

  // --- "QUOTE" ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.setTextColor(primaryColor)
  doc.text('QUOTE', pageWidth - margin, cursor, { align: 'right' })
  cursor += 20

  const sections = parseMarkdownSections(content)

  // --- Quote Title Section ---
  const quoteTitle = sections.quote_title?.[0]
  if (quoteTitle) {
    const cleanTitle = quoteTitle.replace(/#+\s*/, '');
    checkPageBreak(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(primaryColor)
    doc.text(cleanTitle, pageWidth / 2, cursor, { align: 'center' })
    cursor += 15
  }

  // --- SECTION: Scope of Work ---
  const scopeOfWorkLines = sections.scope_of_work || []
  if (scopeOfWorkLines.length > 0) {
    checkPageBreak(20) // Check for space before drawing the heading
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(primaryColor)
    doc.text('Scope Of Work', margin, cursor)
    cursor += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(textColor)
    scopeOfWorkLines.forEach((line) => {
      const textLines = doc.splitTextToSize(line.replace(/^- /, '• '), pageWidth - margin * 2)
      checkPageBreak(textLines.length * 5 + 2)
      doc.text(textLines, margin, cursor)
      cursor += textLines.length * 5 + 2
    })
    cursor += 10
  }

  return Buffer.from(doc.output('arraybuffer'))
}

export const generateModernPdf = (
  content: string,
  companyProfile: any,
  logoBuffer?: Buffer,
  sitePhotoBuffer?: Buffer,
  sitePhotoUrl?: string | null
): Buffer => {
  const doc = new jsPDF()
  const margin = 15
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // --- Define Colors & Helpers ---
  const primaryColor = '#4E9784'
  const textColor = '#333333'
  const checkPageBreak = (spaceNeeded: number) => {
    if (cursor + spaceNeeded > pageHeight - margin) {
      doc.addPage()
      cursor = 20
    }
  }

  // --- Header ---
  const headerY = 15
  let headerBottomY = 0
  // Draw Company Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(textColor)
  doc.text(companyProfile?.name || 'Your Company', margin, headerY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const infoY = headerY + 12
  const lineHeight = 5
  doc.text(companyProfile?.address || '', margin, headerY + 12)
  doc.text(companyProfile?.phone || '', margin, infoY + lineHeight)
  doc.text(companyProfile?.email || '', margin, infoY + lineHeight * 2)
  doc.text(companyProfile?.website || '', margin, infoY + lineHeight * 3)

  // Calculate the bottom of the text block
  headerBottomY = infoY + lineHeight * 3

  // Draw Logo
  if (logoBuffer) {
    try {
      const dimensions = imageSize(logoBuffer)
      const aspectRatio = dimensions.height! / dimensions.width!
      const desiredWidth = 40
      const calculatedHeight = desiredWidth * aspectRatio
      const logoExtension = companyProfile.logoUrl.split('.').pop()?.toUpperCase() || 'PNG'

      // 2. Draw the logo relative to the fixed headerY
      const logoY = headerY - 5
      doc.addImage(logoBuffer, logoExtension, pageWidth - margin - desiredWidth, logoY, desiredWidth, calculatedHeight)

      // Update the header's bottom position if the logo is taller
      if (logoY + calculatedHeight > headerBottomY) {
        headerBottomY = logoY + calculatedHeight
      }
    } catch (error) {
      console.error('Could not add logo.', error)
    }
  }
  // 3. Set the main cursor for the rest of the document below the tallest header element
  let cursor = headerBottomY + 15

  // --- "QUOTE" ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(36)
  doc.setTextColor(primaryColor)
  doc.text('QUOTE', pageWidth - margin, cursor, { align: 'right' })
  cursor += 20

  // --- Parse Content from AI ---
  const sections = parseMarkdownSections(content)

  // --- Bill To & Quote Details ---
  const clientInfoLines = sections.client_information || []
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(primaryColor)
  doc.text('Bill To', margin, cursor)
  cursor += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(textColor)
  clientInfoLines.forEach((line) => {
    doc.text(line.replace(/^- /, ''), margin, cursor)
    cursor += 5
  })

  // --- LOGIC TO DRAW QUOTE DETAILS FROM PARSED CONTENT ---
  const quoteDetailLines = sections.quote_details || []
  let detailsCursor = cursor - clientInfoLines.length * 5 - 5 // Align vertically with "Bill To"

  quoteDetailLines.forEach((line) => {
    const [label, value] = line.replace(/^- /, '').split(':')
    if (label && value) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(primaryColor)
      doc.text(label.trim(), pageWidth - margin - 40, detailsCursor, { align: 'left' })

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(textColor)
      // Format the date if the label includes 'date'
      const formattedValue = label.toLowerCase().includes('date') ? formatDate(value.trim()) : value.trim()
      doc.text(formattedValue, pageWidth - margin, detailsCursor, { align: 'right' })
      detailsCursor += 6
    }
  })
  cursor += 10

  // --- Summary Header ---
  checkPageBreak(20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(primaryColor)
  doc.text('Summary', margin, cursor)
  cursor += 8

  // --- Items Table (from "Summary" section) ---
  const summaryTableLines = sections.summary || []
  if (summaryTableLines.length > 1) {
    const tableHead =
      summaryTableLines[0]
        ?.slice(1, -1)
        .split('|')
        .map((h) => h.trim()) || []
    const tableBody = summaryTableLines.slice(2).map((row) => {
      const cells = row
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())

      // Add the '$' prefix to the cost column (index 1) if it exists
      if (cells.length > 1 && cells[1]) {
        cells[1] = `${cells[1]}`
      }
      return cells
    })
    const mainBody = tableBody.filter((row) => !row[0]?.toLowerCase().includes('total cost'))

    // Calculate the subtotal from main table body
    const subtotal = mainBody.reduce((acc, row) => {
      // Assumes cost is in the second column (index 1)
      const cost = parseFloat(row[1]?.replace(/[^0-9.-]+/g, '')) || 0
      return acc + cost
    }, 0)

    autoTable(doc, {
      startY: cursor,
      head: [tableHead],
      body: mainBody,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 10, textColor: textColor, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index === 1) {
          data.cell.styles.halign = 'right'
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === data.table.body.length - 1) {
          if (data.column.index === 0) {
            doc.setDrawColor(primaryColor)
            doc.setLineWidth(0.5)
            doc.line(margin, data.cell.y + data.cell.height, pageWidth - margin, data.cell.y + data.cell.height)
          }
        }
      },
    })

    cursor = (doc as any).lastAutoTable.finalY

    // --- 3. Calculate Tax and Final Total ---
    const taxRate = 0.05 // 5% Sales Tax
    const taxAmount = subtotal * taxRate
    const finalTotal = subtotal + taxAmount

    const totalBody = [
      ['Subtotal', `$${subtotal.toFixed(2)}`],
      [`Sales Tax (${taxRate * 100}%)`, `$${taxAmount.toFixed(2)}`],
      ['Total (USD)', `$${finalTotal.toFixed(2)}`],
    ]

    // --- Add a new, separate 'autoTable' for the Totals block ---
    autoTable(doc, {
      startY: cursor + 2,
      body: totalBody,
      theme: 'plain',
      tableWidth: 120, // A fixed width for the totals block
      margin: { left: pageWidth - margin - 120 },
      styles: { font: 'helvetica', fontSize: 10, textColor: textColor, cellPadding: 3 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
      },
      // --- Highlight the 'Total' row with a light green background ---
      willDrawCell: (data) => {
        const isTotalRow = data.row.index === totalBody.length - 1
        if (isTotalRow) {
          doc.setFillColor('#E8F5E9') // Light green highlight color
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
        }
      },

      // --- Make the 'Total' row text bold ---
      didParseCell: (data) => {
        const isTotalRow = data.row.index === totalBody.length - 1
        if (isTotalRow) {
          data.cell.styles.fontStyle = 'bold'
        }
      },

      // --- Draw a line UNDER the 'Total' row ---
      didDrawCell: (data) => {
        const isTotalRow = data.row.index === totalBody.length - 1
        if (isTotalRow) {
          doc.setDrawColor(primaryColor)
          doc.setLineWidth(0.5)
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      },
    })

    cursor = (doc as any).lastAutoTable.finalY
  }

  cursor += 20

  // --- Terms and Conditions ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(primaryColor)
  doc.text('Terms and Conditions', margin, cursor)
  cursor += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(textColor)
  const termsText = companyProfile?.termsAndConditions || ''
  const wrappedTerms = doc.splitTextToSize(termsText, pageWidth - margin * 2)
  doc.text(wrappedTerms, margin, cursor)

  cursor += wrappedTerms.length * 4;

  cursor += 20

  // --- Quote Title Section ---
  const quoteTitle = sections.quote_title?.[0]
  if (quoteTitle) {
    checkPageBreak(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(primaryColor)
    doc.text(quoteTitle, pageWidth / 2, cursor, { align: 'center' })
    cursor += 15
  }

  // --- SECTION: Scope of Work ---
  const scopeOfWorkLines = sections.scope_of_work || []
  if (scopeOfWorkLines.length > 0) {
    checkPageBreak(20) // Check for space before drawing the heading
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(primaryColor)
    doc.text('Scope Of Work', margin, cursor)
    cursor += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(textColor)
    scopeOfWorkLines.forEach((line) => {
      const textLines = doc.splitTextToSize(line.replace(/^- /, '• '), pageWidth - margin * 2)
      checkPageBreak(textLines.length * 5 + 2)
      doc.text(textLines, margin, cursor)
      cursor += textLines.length * 5 + 2
    })
    cursor += 10
  }

  // --- NEW SECTION: Project Timeline ---
  const timelineTableLines = sections.project_timeline || []
  if (timelineTableLines.length > 1) {
    checkPageBreak(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(primaryColor)
    doc.text('Project Timeline', margin, cursor)
    cursor += 6

    const timelineHead =
      timelineTableLines[0]
        ?.slice(1, -1)
        .split('|')
        .map((h) => h.trim()) || []
    const timelineBody = timelineTableLines.slice(2).map((row) =>
      row
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())
    )

    autoTable(doc, {
      startY: cursor,
      head: [timelineHead],
      body: timelineBody,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 10, textColor: textColor, cellPadding: 3 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    })
    cursor = (doc as any).lastAutoTable.finalY + 15
  }

  // --- Customer Signature ---
  checkPageBreak(40)
  cursor += 20
  const sigX = pageWidth - margin - 80
  const sigY = cursor
  doc.setDrawColor(primaryColor)
  doc.setLineWidth(0.2)
  doc.line(sigX, sigY, pageWidth - margin, sigY)
  doc.setFontSize(9)
  doc.setTextColor(textColor)
  doc.text('Customer Signature', sigX + 40, sigY + 5, { align: 'center' })
  cursor = sigY + 10

  // --- NEW SECTION: Site Photo ---
  if (sections.site_photo && sitePhotoBuffer && sitePhotoUrl) {
    checkPageBreak(80) // Check if there's enough space for header + part of image
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(primaryColor)
    doc.text('Site Photo', margin, cursor)
    cursor += 6

    try {
      const dimensions = imageSize(sitePhotoBuffer)
      const aspectRatio = dimensions.height! / dimensions.width!
      const imageWidth = pageWidth - margin * 2
      const imageHeight = imageWidth * aspectRatio

      checkPageBreak(imageHeight + 10)

      const imageExtension = sitePhotoUrl.split('.').pop()?.toUpperCase() || 'JPEG'
      doc.addImage(sitePhotoBuffer, imageExtension, margin, cursor, imageWidth, imageHeight)
      cursor += imageHeight + 10
    } catch (error) {
      console.error('Could not process site photo.', error)
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}