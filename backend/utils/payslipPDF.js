import PDFDocument from "pdfkit";

export const generatePayslipPDF = (payroll, employee) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const fmt = (n) => `INR ${(n || 0).toLocaleString("en-IN")}`;
  const monthLabel = `${monthNames[payroll.month - 1]} ${payroll.year}`;

  // ── Header ──────────────────────────────────────────────
  doc.rect(0, 0, 595, 100).fill("#1a0533");
  doc.fillColor("#ffffff")
     .font("Helvetica-Bold")
     .fontSize(22)
     .text("HRMS Portal", 50, 28);
  doc.fillColor("#c084fc")
     .font("Helvetica")
     .fontSize(11)
     .text("Payslip / Salary Statement", 50, 56);
  doc.fillColor("#ffffff")
     .fontSize(11)
     .text(`For the month of ${monthLabel}`, 350, 40, { align: "right", width: 195 });

  doc.moveDown(4);

  // ── Employee Info ────────────────────────────────────────
  doc.fillColor("#1a0533")
     .font("Helvetica-Bold")
     .fontSize(13)
     .text("Employee Details", 50, 120);

  doc.moveTo(50, 138).lineTo(545, 138).strokeColor("#e9d5ff").stroke();

  const infoY = 148;
  const col1  = 50;
  const col2  = 300;

  const infoRows = [
    ["Employee Name",  `${employee.firstName} ${employee.lastName}`],
    ["Employee ID",    employee.employeeId],
    ["Designation",    employee.designation || "—"],
    ["Department",     employee.department?.name || "—"],
    ["Employment Type",employee.employmentType?.replace("_", " ") || "—"],
    ["Pay Period",     monthLabel],
  ];

  infoRows.forEach(([label, value], i) => {
    const y = infoY + i * 22;
    doc.fillColor("#6b7280").font("Helvetica").fontSize(10).text(label, col1, y);
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text(value, col2, y);
  });

  // ── Attendance Summary ───────────────────────────────────
  const attY = infoY + infoRows.length * 22 + 20;
  doc.fillColor("#1a0533").font("Helvetica-Bold").fontSize(13).text("Attendance Summary", col1, attY);
  doc.moveTo(50, attY + 18).lineTo(545, attY + 18).strokeColor("#e9d5ff").stroke();

  const attRows = [
    ["Working Days",  payroll.workingDays],
    ["Days Present",  payroll.presentDays],
    ["Leave Days",    payroll.leaveDays],
    ["Absent Days",   payroll.absentDays],
  ];

  attRows.forEach(([label, value], i) => {
    const y = attY + 28 + i * 20;
    doc.fillColor("#6b7280").font("Helvetica").fontSize(10).text(label, col1, y);
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text(String(value), col2, y);
  });

  // ── Earnings & Deductions ────────────────────────────────
  const salY = attY + 28 + attRows.length * 20 + 20;
  doc.fillColor("#1a0533").font("Helvetica-Bold").fontSize(13).text("Salary Breakdown", col1, salY);
  doc.moveTo(50, salY + 18).lineTo(545, salY + 18).strokeColor("#e9d5ff").stroke();

  // Table header
  const tableY = salY + 28;
  doc.rect(50, tableY, 495, 22).fill("#f3e8ff");
  doc.fillColor("#6b21a8").font("Helvetica-Bold").fontSize(10)
     .text("Earnings", 60, tableY + 6)
     .text("Amount", 250, tableY + 6)
     .text("Deductions", 330, tableY + 6)
     .text("Amount", 490, tableY + 6);

  const earningsRows = [
    ["Basic Salary",  payroll.basic],
    ["HRA",           payroll.hra],
    ["Allowances",    payroll.allowances],
  ];

  const deductionRows = [
    ["Deductions",     payroll.deductions],
    ["Tax (TDS)",      payroll.taxDeduction],
    ["Provident Fund", payroll.pfDeduction],
    ["Late Deduction", payroll.lateDeduction],
  ];

  const maxRows = Math.max(earningsRows.length, deductionRows.length);

  for (let i = 0; i < maxRows; i++) {
    const y = tableY + 22 + i * 22;
    if (i % 2 === 0) doc.rect(50, y, 495, 22).fill("#faf5ff");
    else doc.rect(50, y, 495, 22).fill("#ffffff");

    if (earningsRows[i]) {
      doc.fillColor("#374151").font("Helvetica").fontSize(10).text(earningsRows[i][0], 60, y + 6);
      doc.fillColor("#059669").font("Helvetica-Bold").fontSize(10).text(fmt(earningsRows[i][1]), 250, y + 6);
    }
    if (deductionRows[i]) {
      doc.fillColor("#374151").font("Helvetica").fontSize(10).text(deductionRows[i][0], 330, y + 6);
      doc.fillColor("#dc2626").font("Helvetica-Bold").fontSize(10).text(fmt(deductionRows[i][1]), 490, y + 6);
    }
  }

  // ── Totals ───────────────────────────────────────────────
  const totY = tableY + 22 + maxRows * 22;
  doc.rect(50, totY, 495, 28).fill("#1a0533");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11)
     .text("Gross Salary", 60, totY + 8)
     .text(fmt(payroll.grossSalary), 250, totY + 8);

  const netY = totY + 28;
  doc.rect(50, netY, 495, 32).fill("#7c3aed");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13)
     .text("NET SALARY (Take Home)", 60, netY + 9)
     .text(fmt(payroll.netSalary), 430, netY + 9);

  // ── Footer ───────────────────────────────────────────────
  const footY = netY + 60;
  doc.fillColor("#9ca3af").font("Helvetica").fontSize(9)
     .text("This is a system-generated payslip and does not require a signature.", 50, footY, { align: "center", width: 495 })
     .text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 50, footY + 14, { align: "center", width: 495 });

  doc.moveTo(50, footY - 10).lineTo(545, footY - 10).strokeColor("#e9d5ff").stroke();

  doc.end();
  return doc;
};
