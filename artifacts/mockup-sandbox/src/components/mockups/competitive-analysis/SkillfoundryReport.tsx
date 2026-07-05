import React from "react";
// @ts-expect-error - plain JS module shared with the PDF build pipeline
import { renderReportHTML, REPORT_CSS } from "./report-template.js";
import reportData from "./report-data.json";

export function SkillfoundryReport() {
  const html = renderReportHTML(reportData as unknown as Record<string, unknown>);
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#3a332a",
        padding: "40px 0",
        overflowY: "auto",
      }}
    >
      <style>{REPORT_CSS}</style>
      <div
        className="report"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default SkillfoundryReport;
