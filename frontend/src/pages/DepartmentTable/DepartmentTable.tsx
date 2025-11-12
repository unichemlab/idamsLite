import React, { useState, useEffect } from "react";
import styles from "./DepartmentTable.module.css";
import { fetchDepartments } from "../../utils/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import unichemLogoBase64 from "../../assets/unichemLogoBase64";

const DepartmentTable: React.FC = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await fetchDepartments();
        setDepartments(data);
      } catch (err) {
        setError("Failed to load departments");
      } finally {
        setLoading(false);
      }
    };
    loadDepartments();
  }, []);

  if (loading) return <div>Loading departments...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.tableWrapper}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Department Table</h2>
        <button
          onClick={() => {
            const doc = new jsPDF({ orientation: "landscape" });
            const today = new Date();
            const fileName = `Departments_${
              today.toISOString().split("T")[0]
            }.pdf`;

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageMargin = 14;
            const headerHeight = 20;
            doc.setFillColor(0, 82, 155);
            doc.rect(0, 0, pageWidth, headerHeight, "F");

            // logo
            let logoW = 0;
            let logoH = 0;
            try {
              if (
                unichemLogoBase64 &&
                unichemLogoBase64.startsWith("data:image")
              ) {
                logoW = 50;
                logoH = 18;
                const logoY = headerHeight / 2 - logoH / 2;
                doc.addImage(
                  unichemLogoBase64,
                  "PNG",
                  pageMargin,
                  logoY,
                  logoW,
                  logoH
                );
              }
            } catch {}

            doc.setFontSize(16);
            doc.setTextColor(255, 255, 255);
            const titleX = pageMargin + logoW + 10;
            const titleY = headerHeight / 2 + 5;
            doc.text("Department Table", titleX, titleY);

            doc.setFontSize(9);
            doc.setTextColor(220, 230, 245);
            const exportedText = `Exported on: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}`;
            const textWidth = doc.getTextWidth(exportedText);
            doc.text(exportedText, pageWidth - pageMargin - textWidth, titleY);

            doc.setDrawColor(0, 82, 155);
            doc.setLineWidth(0.5);
            doc.line(0, headerHeight, pageWidth, headerHeight);

            const rows = departments.map((d) => [
              d.id ?? "",
              d.name ?? "",
              d.description ?? "",
              d.status ?? "",
            ]);

            autoTable(doc, {
              head: [["ID", "Department Name", "Description", "Status"]],
              body: rows,
              startY: headerHeight + 8,
              styles: { fontSize: 11, cellPadding: 3 },
              headStyles: {
                fillColor: [11, 99, 206],
                textColor: 255,
                fontStyle: "bold",
              },
              alternateRowStyles: { fillColor: [240, 245, 255] },
              margin: { left: pageMargin, right: pageMargin },
              tableWidth: "auto",
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const pageCount =
              (doc as any).getNumberOfPages?.() ||
              (doc as any).internal?.getNumberOfPages?.() ||
              1;
            doc.setFontSize(9);
            doc.setTextColor(100);
            for (let i = 1; i <= pageCount; i++) {
              doc.setPage(i);
              doc.text("Unichem Laboratories", pageMargin, pageHeight - 6);
              doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth - pageMargin - 30,
                pageHeight - 6
              );
            }

            doc.save(fileName);
          }}
          className={styles.exportBtn}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "#0b63ce",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Export PDF
        </button>
      </div>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Department Name</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td>{dept.id}</td>
              <td>{dept.name}</td>
              <td>{dept.description}</td>
              <td>{dept.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentTable;
