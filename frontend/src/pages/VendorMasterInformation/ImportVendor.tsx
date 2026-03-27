import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";

const XLSX = require('xlsx');

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

const ImportVendor: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  const requiredFields = ['vendor_name', 'description', 'status'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['vendor_name','vendor_code', 'description', 'status'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ['Hitachi','HT011', 'Hitachi Company', 'ACTIVE']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Information Template');
    XLSX.writeFile(wb, 'vendor_import_template.xlsx');
  };

  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    requiredFields.forEach(field => {
      if (!data[field] || data[field] === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`,
          value: data[field]
        });
      }
    });

    if (data.status && !['ACTIVE', 'INACTIVE'].includes(data.status)) {
      errors.push({
        row: rowNumber,
        field: 'status',
        message: 'Status must be ACTIVE or INACTIVE',
        value: data.status
      });
    }

    return {
      rowNumber,
      data,
      errors,
      isValid: errors.length === 0
    };
  };

  // const handleValidate = async () => {
  //   if (!file) {
  //     alert('Please select a file first');
  //     return;
  //   }

  //   setValidating(true);
    
  //   try {
  //     const data = await file.arrayBuffer();
  //     const workbook = XLSX.read(data);
  //     const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  //     const jsonData = XLSX.utils.sheet_to_json(worksheet);

  //     const validatedRecords: ImportRecord[] = jsonData.map((row: any, index: number) => 
  //       validateRecord(row, index + 2)
  //     );

  //     const valid: ImportRecord[] = validatedRecords.filter((r: ImportRecord) => r.isValid);
  //     const invalid: ImportRecord[] = validatedRecords.filter((r: ImportRecord) => !r.isValid);

  //     setValidRecords(valid.map((r: ImportRecord) => r.data));
  //     setInvalidRecords(invalid);
  //     setShowResults(true);
  //   } catch (error) {
  //     console.error('Validation error:', error);
  //     alert('Error validating file. Please check the file format.');
  //   } finally {
  //     setValidating(false);
  //   }
  // };


   const handleValidate = async () => {
  if (!file) {
    alert('Please select a file first');
    return;
  }

  setValidating(true);

  try {
    // -------------------------------
    // STEP 1: Read Excel
    // -------------------------------
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      alert('Excel file is empty');
      setValidating(false);
      return;
    }

    // -------------------------------
    // STEP 2: Excel duplicate check
    // -------------------------------
    const vendorMap: Record<string, number[]> = {};

    jsonData.forEach((row: any, index: number) => {
      const vendor = row.vendor_name?.toLowerCase()?.trim();
      if (!vendor) return;

      if (!vendorMap[vendor]) vendorMap[vendor] = [];
      vendorMap[vendor].push(index + 2); // Excel row number
    });

    // -------------------------------
    // STEP 3: DB duplicate check (bulk API)
    // -------------------------------
    let dbDuplicateMap: Record<string, boolean> = {};

    const vendorNames = jsonData
      .map((r: any) => r.vendor_name?.toLowerCase()?.trim())
      .filter((r: string) => r);

    if (vendorNames.length > 0) {
      try {
        const res = await fetch(`${API_BASE}/api/master-approvals/bulk-check-duplicate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            module: "vendors",
            names: vendorNames
          })
        });

        if (res.ok) {
          const result = await res.json();
          dbDuplicateMap = result.duplicateMap || {};
        } else {
          console.warn("DB duplicate API failed");
        }
      } catch (err) {
        console.error("DB duplicate check error:", err);
      }
    }

    // -------------------------------
    // STEP 4: Validate each row
    // -------------------------------
    const validatedRecords: ImportRecord[] = jsonData.map((row: any, index: number) => {
      const record = validateRecord(row, index + 2);
      const vendor = row.role_name?.toLowerCase()?.trim();

      // ❌ Excel duplicate
      if (vendor && vendorMap[vendor]?.length > 1) {
        record.errors.push({
          row: index + 2,
          field: 'role_name',
          message: `Duplicate in file (rows: ${vendorMap[vendor].join(', ')})`,
          value: row.vendor_name
        });
        record.isValid = false;
      }

      // ❌ DB duplicate
      if (vendor && dbDuplicateMap[vendor]) {
        record.errors.push({
          row: index + 2,
          field: 'vendor_name',
          message: `Vendor already exists in system`,
          value: row.vendor_name
        });
        record.isValid = false;
      }

      return record;
    });

    // -------------------------------
    // STEP 5: Split valid / invalid
    // -------------------------------
    const valid = validatedRecords.filter(r => r.isValid);
    const invalid = validatedRecords.filter(r => !r.isValid);

    setValidRecords(valid.map(r => r.data));
    setInvalidRecords(invalid);
    setShowResults(true);

  } catch (error) {
    console.error('Validation error:', error);
    alert('Error validating file. Please check format.');
  } finally {
    setValidating(false);
  }
};

  const handleImport = async () => {
    if (validRecords.length === 0) {
      alert('No valid records to import');
      return;
    }

    setImporting(true);

    try {
      const response = await fetch(`${API_BASE}/api/vendors/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          records: validRecords,
          requestedBy: user?.id,
          requestedByUsername: user?.username
        })
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      alert(`Import successful! ${validRecords.length} records submitted for approval.`);
      navigate('/vendor-information');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing records. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Vendor Information" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import Vendor Information from Excel</h2>
            <p>Upload an Excel file to bulk import Vendor Information records</p>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h3>Step 1: Download Template</h3>
              <button className={styles.saveBtn} onClick={downloadTemplate} style={{ marginTop: '10px' }}>
                Download Excel Template
              </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3>Step 2: Upload File</h3>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} style={{ marginTop: '10px' }} />
              {file && <p style={{ marginTop: '10px', color: '#22c55e' }}>Selected: {file.name}</p>}
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3>Step 3: Validate Data</h3>
              <button className={styles.saveBtn} onClick={handleValidate} disabled={!file || validating} style={{ marginTop: '10px' }}>
                {validating ? 'Validating...' : 'Validate File'}
              </button>
            </div>

            {showResults && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Validation Results</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                  <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #22c55e' }}>
                    <h4 style={{ color: '#22c55e', margin: '0 0 10px 0' }}>✓ Valid Records: {validRecords.length}</h4>
                  </div>

                  <div style={{ padding: '20px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #ef4444' }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>✗ Invalid Records: {invalidRecords.length}</h4>
                  </div>
                </div>

                {invalidRecords.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Validation Errors:</h4>
                    <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Row</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Field</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invalidRecords.flatMap((record: ImportRecord) => 
                            record.errors.map((error: ValidationError, idx: number) => (
                              <tr key={`${record.rowNumber}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px' }}>{error.row}</td>
                                <td style={{ padding: '12px' }}>{error.field}</td>
                                <td style={{ padding: '12px', color: '#ef4444' }}>{error.message}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {validRecords.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>Step 4: Import Valid Records</h3>
                    <button className={styles.saveBtn} onClick={handleImport} disabled={importing} style={{ marginTop: '10px' }}>
                      {importing ? 'Importing...' : `Import ${validRecords.length} Records`}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '30px' }}>
              <button className={styles.cancelBtn} onClick={() => navigate('/vendor-information')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportVendor;