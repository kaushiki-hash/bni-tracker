import { formatDate } from '../utils/date-helper.js';

/**
 * Export attendance data to Excel using SheetJS
 */
export const exportToExcel = (attendanceData, filename = 'attendance') => {
  try {
    // Check if SheetJS is loaded
    if (typeof XLSX === 'undefined') {
      alert('SheetJS library not loaded. Please ensure it is included in the HTML.');
      return false;
    }

    // Prepare data for Excel
    const excelData = attendanceData.map(record => ({
      'Member Name': record.memberName,
      'Team': record.teamName,
      'Captain': record.captainName,
      'Status': record.presentStatus,
      'Reason': record.absenceReason,
      'Prior Intimation': record.priorIntimation,
      'Date': formatDate(record.meetingDate, 'DD/MM/YYYY')
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Member Name
      { wch: 15 }, // Team
      { wch: 15 }, // Captain
      { wch: 12 }, // Status
      { wch: 15 }, // Reason
      { wch: 15 }, // Prior Intimation
      { wch: 12 }  // Date
    ];

    // Download the file
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Error exporting to Excel: ' + error.message);
    return false;
  }
};

/**
 * Export attendance data to PDF using jsPDF
 */
export const exportToPDF = (attendanceData, filename = 'attendance', title = 'Attendance Report') => {
  try {
    // Check if jsPDF is loaded
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      alert('jsPDF library not loaded. Please ensure it is included in the HTML.');
      return false;
    }

    const { jsPDF } = jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape mode
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 22);

    // Add date
    doc.setFontSize(10);
    const currentDate = formatDate(new Date(), 'DD/MM/YYYY');
    doc.text(`Generated on: ${currentDate}`, 14, 30);

    // Table data
    const columns = ['Member Name', 'Team', 'Captain', 'Status', 'Reason', 'Prior Intimation', 'Date'];
    const rows = attendanceData.map(record => [
      record.memberName,
      record.teamName,
      record.captainName,
      record.presentStatus,
      record.absenceReason,
      record.priorIntimation,
      formatDate(record.meetingDate, 'DD/MM/YYYY')
    ]);

    // Auto table
    if (typeof autoTable !== 'undefined') {
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 35,
        theme: 'grid',
        headStyles: {
          fillColor: [13, 110, 253],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 }
        },
        margin: { left: 14, right: 14 }
      });
    } else {
      // Fallback if autoTable is not available
      doc.autoTable({
        head: [columns],
        body: rows,
        startY: 35
      });
    }

    // Add page numbers
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Download the file
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`${filename}_${timestamp}.pdf`);

    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Error exporting to PDF: ' + error.message);
    return false;
  }
};

/**
 * Share attendance data via WhatsApp
 */
export const shareViaWhatsApp = (attendanceData, filename = 'attendance') => {
  try {
    // Create a summary text
    const summary = attendanceData
      .slice(0, 10)
      .map(r => `${r.memberName} (${r.teamName}): ${r.presentStatus === 'Yes' ? '✅' : '❌'}`)
      .join('\n');

    const text = `Attendance Report\n\n${summary}${attendanceData.length > 10 ? `\n... and ${attendanceData.length - 10} more` : ''}`;

    // Open WhatsApp with the message
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
    return true;
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    alert('Error sharing via WhatsApp: ' + error.message);
    return false;
  }
};

/**
 * Create export button HTML
 */
export const createExportButtonsHTML = (attendanceData = []) => {
  return `
    <div class="flex flex-wrap gap-3" id="export-buttons-container">
      <button 
        id="btn-export-excel" 
        onclick="window.exportToExcelHandler()"
        class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        ${attendanceData.length === 0 ? 'disabled' : ''}
      >
        <span>📊</span> Export to Excel
      </button>
      
      <button 
        id="btn-export-pdf" 
        onclick="window.exportToPDFHandler()"
        class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        ${attendanceData.length === 0 ? 'disabled' : ''}
      >
        <span>📄</span> Export to PDF
      </button>
      
      <button 
        id="btn-share-whatsapp" 
        onclick="window.shareViaWhatsAppHandler()"
        class="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
        ${attendanceData.length === 0 ? 'disabled' : ''}
      >
        <span>💬</span> Share via WhatsApp
      </button>
    </div>
  `;
};

