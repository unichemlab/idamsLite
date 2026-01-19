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

const ImportDepartment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  const requiredFields = ['department_name'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['department_name', 'description', 'status'];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ['Production', 'Production Department', 'ACTIVE']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Department Template');
    XLSX.writeFile(wb, 'department_import_template.xlsx');
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

  const handleValidate = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setValidating(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const validatedRecords: ImportRecord[] = jsonData.map((row: any, index: number) => 
        validateRecord(row, index + 2)
      );

      const valid: ImportRecord[] = validatedRecords.filter((r: ImportRecord) => r.isValid);
      const invalid: ImportRecord[] = validatedRecords.filter((r: ImportRecord) => !r.isValid);

      setValidRecords(valid.map((r: ImportRecord) => r.data));
      setInvalidRecords(invalid);
      setShowResults(true);
    } catch (error) {
      console.error('Validation error:', error);
      alert('Error validating file. Please check the file format.');
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
      const response = await fetch(`${API_BASE}/api/departments/import`, {
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
      navigate('/department-master');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing records. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Departments" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import Departments from Excel</h2>
            <p>Upload an Excel file to bulk import department records</p>
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
              <button className={styles.cancelBtn} onClick={() => navigate('/department-master')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDepartment;