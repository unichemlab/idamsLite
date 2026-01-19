import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";
import ExcelJS from 'exceljs';
const XLSX = require('xlsx');

// ---------------- TYPES ----------------
interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ImportRecord {
  rowNumber: number;
  data: any;
  errors: ValidationError[];
  isValid: boolean;
}

interface Plant {
  id: number;
  plant_name: string;
}

// ---------------- COMPONENT ----------------
const ImportNetwork: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);

  // ---------------- REQUIRED FIELDS ----------------
  const requiredFields = [
    "plant_location_id",
    "host_name",
    "device_ip",
    "device_type",
  ];

  // ---------------- DROPDOWN OPTIONS ----------------
  const validOptions: Record<string, string[]> = {
    dual_power_source: ["ATS", "YES", "NO"],
    stack: ["YES", "NO"],
    sfp_fiber_tx: ["FIBER", "TX"],
    poe_non_poe: ["POE", "NON POE"],
    under_amc: ["YES", "NO"],
    status: ["ACTIVE", "INACTIVE"],
  };

  // ---------------- FETCH MASTER DATA ----------------
  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPlants(data);
      }
    } catch (err) {
      console.error("Error fetching plants:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILE HANDLER ----------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
    }
  };

  // ---------------- DOWNLOAD TEMPLATE ----------------
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();

      // ================= MAIN SHEET =================
      const worksheet = workbook.addWorksheet("Network Template");

      worksheet.columns = [
        { header: "plant_location_id", key: "plant_location_id", width: 35 }, // A
        { header: "area", key: "area", width: 20 },                           // B
        { header: "rack", key: "rack", width: 20 },                           // C
        { header: "host_name", key: "host_name", width: 25 },                 // D
        { header: "device_ip", key: "device_ip", width: 20 },                 // E
        { header: "device_type", key: "device_type", width: 20 },             // F
        { header: "device_model", key: "device_model", width: 20 },           // G
        { header: "make_vendor", key: "make_vendor", width: 20 },             // H
        { header: "dual_power_source", key: "dual_power_source", width: 22 }, // I
        { header: "trunk_port", key: "trunk_port", width: 18 },               // J
        { header: "stack", key: "stack", width: 15 },                         // K
        { header: "stack_switch_details", key: "stack_switch_details", width: 28 }, // L
        { header: "neighbor_switch_ip", key: "neighbor_switch_ip", width: 22 },     // M
        { header: "neighbor_port", key: "neighbor_port", width: 18 },         // N
        { header: "sfp_fiber_tx", key: "sfp_fiber_tx", width: 18 },            // O
        { header: "poe_non_poe", key: "poe_non_poe", width: 18 },              // P
        { header: "serial_no", key: "serial_no", width: 20 },                 // Q
        { header: "ios_version", key: "ios_version", width: 18 },             // R
        { header: "uptime", key: "uptime", width: 15 },                       // S
        { header: "verify_date", key: "verify_date", width: 18 },             // T
        { header: "purchased_po", key: "purchased_po", width: 20 },           // U
        { header: "purchased_date", key: "purchased_date", width: 18 },       // V
        { header: "purchase_vendor", key: "purchase_vendor", width: 22 },     // W
        { header: "sap_asset_no", key: "sap_asset_no", width: 22 },            // X
        { header: "service_type", key: "service_type", width: 18 },           // Y
        { header: "warranty_start_date", key: "warranty_start_date", width: 22 }, // Z
        { header: "amc_warranty_expiry_date", key: "amc_warranty_expiry_date", width: 28 }, // AA
        { header: "under_amc", key: "under_amc", width: 15 },                 // AB
        { header: "amc_vendor", key: "amc_vendor", width: 22 },               // AC
        { header: "remarks", key: "remarks", width: 25 },                    // AD
        { header: "status", key: "status", width: 15 },                      // AE
      ];

      // ================= ADD SAMPLE DATA ROW =================
      worksheet.addRow({
        plant_location_id: plants.length > 0 ? `${plants[0].id} - ${plants[0].plant_name}` : "",
        area: "Production Area",
        rack: "Rack-01",
        host_name: "SWITCH-PROD-01",
        device_ip: "192.168.1.10",
        device_type: "L3 Switch",
        device_model: "Catalyst 9300",
        make_vendor: "Cisco",
        dual_power_source: "ATS",
        trunk_port: "1-4",
        stack: "YES",
        stack_switch_details: "Stack of 2 switches",
        neighbor_switch_ip: "192.168.1.1",
        neighbor_port: "Gi1/0/1",
        sfp_fiber_tx: "FIBER",
        poe_non_poe: "POE",
        serial_no: "FCW2222A0AB",
        ios_version: "16.12.04",
        uptime: "365 days",
        verify_date: "2024-01-15",
        purchased_po: "PO-2024-001",
        purchased_date: "2024-01-01",
        purchase_vendor: "Cisco Partner",
        sap_asset_no: "ASSET-001",
        service_type: "Premium",
        warranty_start_date: "2024-01-01",
        amc_warranty_expiry_date: "2027-01-01",
        under_amc: "YES",
        amc_vendor: "Cisco",
        remarks: "Primary production switch",
        status: "ACTIVE"
      });

      // ================= LOOKUP SHEET =================
      const lookupSheet = workbook.addWorksheet("Lookup Data");

      lookupSheet.columns = [
        { header: "PlantOptions", key: "plant", width: 40 },    // A
        { header: "DualPower", key: "dual", width: 15 },        // B
        { header: "Stack", key: "stack", width: 15 },          // C
        { header: "SFP", key: "sfp", width: 15 },              // D
        { header: "POE", key: "poe", width: 15 },              // E
        { header: "UnderAMC", key: "amc", width: 15 },         // F
        { header: "Status", key: "status", width: 15 },        // G
      ];

      const maxRows = Math.max(plants.length, 3);

      for (let i = 0; i < maxRows; i++) {
        lookupSheet.addRow({
          plant: plants[i] ? `${plants[i].id} - ${plants[i].plant_name}` : "",
          dual: i === 0 ? "ATS" : i === 1 ? "YES" : i === 2 ? "NO" : "",
          stack: i === 0 ? "YES" : i === 1 ? "NO" : "",
          sfp: i === 0 ? "FIBER" : i === 1 ? "TX" : "",
          poe: i === 0 ? "POE" : i === 1 ? "NON POE" : "",
          amc: i === 0 ? "YES" : i === 1 ? "NO" : "",
          status: i === 0 ? "ACTIVE" : i === 1 ? "INACTIVE" : "",
        });
      }

      // ================= DROPDOWNS =================
      for (let row = 2; row <= 1000; row++) {
        // Plant → Column A
        if (plants.length > 0) {
          worksheet.getCell(`A${row}`).dataValidation = {
            type: "list",
            allowBlank: false,
            formulae: [`'Lookup Data'!$A$2:$A$${plants.length + 1}`],
            showErrorMessage: true,
            errorTitle: "Invalid Plant",
            error: "Please select a Plant from dropdown",
          };
        }

        // Dual Power → Column I
        worksheet.getCell(`I${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$B$2:$B$4`],
        };

        // Stack → Column K
        worksheet.getCell(`K${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$C$2:$C$3`],
        };

        // SFP / TX → Column O
        worksheet.getCell(`O${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$D$2:$D$3`],
        };

        // POE / NON POE → Column P
        worksheet.getCell(`P${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$E$2:$E$3`],
        };

        // Under AMC → Column AB
        worksheet.getCell(`AB${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$F$2:$F$3`],
        };

        // Status → Column AE
        worksheet.getCell(`AE${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`'Lookup Data'!$G$2:$G$3`],
        };
      }

      // ================= DOWNLOAD =================
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "network_import_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Template error:", error);
      alert("Error creating template. Please try again.");
    }
  };



  // ---------------- VALIDATION ----------------
  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    // Extract plant id from "ID - Name"
    if (typeof data.plant_location_id === "string" && data.plant_location_id.includes(" - ")) {
      data.plant_location_id = data.plant_location_id.split(" - ")[0].trim();
    }

    // Required fields
    requiredFields.forEach((field) => {
      if (!data[field] || data[field] === "") {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`,
          value: data[field],
        });
      }
    });

    // Plant validation
    if (data.plant_location_id) {
      const exists = plants.some((p) => p.id === Number(data.plant_location_id));
      if (!exists) {
        errors.push({
          row: rowNumber,
          field: "plant_location_id",
          message: "Invalid Plant selected",
          value: data.plant_location_id,
        });
      }
    }

    // Dropdown validations
    Object.keys(validOptions).forEach((field) => {
      if (data[field]) {
        const val = String(data[field]).toUpperCase();
        if (!validOptions[field].includes(val)) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid value. Allowed: ${validOptions[field].join(", ")}`,
            value: data[field],
          });
        } else {
          data[field] = val; // normalize
        }
      }
    });

    return {
      rowNumber,
      data,
      errors,
      isValid: errors.length === 0,
    };
  };

  // ---------------- VALIDATE FILE ----------------
  const handleValidate = async () => {
    if (!file) return alert("Please select a file");

    setValidating(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const validated: ImportRecord[] = rows.map((row: any, idx: number) =>
        validateRecord(row, idx + 2)
      );

      const valid = validated.filter((r) => r.isValid);
      const invalid = validated.filter((r) => !r.isValid);

      setValidRecords(valid.map((r) => r.data));
      setInvalidRecords(invalid);
      setShowResults(true);
    } catch (err) {
      console.error("Validation error:", err);
      alert("Invalid file format");
    } finally {
      setValidating(false);
    }
  };

  // ---------------- IMPORT ----------------
  const handleImport = async () => {
    if (validRecords.length === 0) return alert("No valid records");

    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/networks/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          records: validRecords,
          requestedBy: user?.id,
          requestedByUsername: user?.username,
        }),
      });

      if (!res.ok) throw new Error("Import failed");

      alert(`Import successful! ${validRecords.length} records submitted for approval.`);
      navigate("/network-master");
    } catch (err) {
      console.error("Import error:", err);
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Network Devices" />

      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div style={{ padding: 20 }}>
            <h3>Step 1: Download Template</h3>
            <button
              className={styles.saveBtn}
              onClick={downloadTemplate}
              disabled={loading || plants.length === 0}
            >
              {loading ? "Loading..." : "Download Excel Template"}
            </button>

            <h3 style={{ marginTop: 30 }}>Step 2: Upload File</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />

            <h3 style={{ marginTop: 30 }}>Step 3: Validate</h3>
            <button className={styles.saveBtn} onClick={handleValidate} disabled={validating}>
              {validating ? "Validating..." : "Validate File"}
            </button>

            {showResults && (
              <>
                <p style={{ marginTop: 20 }}>Valid Records: {validRecords.length}</p>
                <p>Invalid Records: {invalidRecords.length}</p>

                {invalidRecords.length > 0 && (
                  <div style={{ maxHeight: 250, overflow: "auto", border: "1px solid #ddd" }}>
                    <table style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Field</th>
                          <th>Error</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invalidRecords.flatMap((rec) =>
                          rec.errors.map((e, i) => (
                            <tr key={`${rec.rowNumber}-${i}`}>
                              <td>{e.row}</td>
                              <td>{e.field}</td>
                              <td style={{ color: "red" }}>{e.message}</td>
                              <td>{String(e.value)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {validRecords.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 30 }}>Step 4: Import</h3>
                    <button className={styles.saveBtn} onClick={handleImport} disabled={importing}>
                      {importing ? "Importing..." : `Import ${validRecords.length} Records`}
                    </button>
                  </>
                )}
              </>
            )}

            <div style={{ marginTop: 30 }}>
              <button className={styles.cancelBtn} onClick={() => navigate("/network-master")}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportNetwork;
