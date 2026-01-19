import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";
// Use require instead of import for xlsx to avoid TS errors
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

const ImportServerInventory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Required fields for server inventory
  const requiredFields = [
    'plant_location_id',
    'type_tower_rack_mounted',
    'vm_type',
    'domain_workgroup',
    'backup_agent',
    'antivirus',
    'category_gxp'
  ];

  // Valid options for dropdown fields
  const validOptions: Record<string, string[]> = {
    type_tower_rack_mounted: ['Tower', 'Rack'],
    vm_type: ['Physical', 'Virtual'],
    domain_workgroup: ['Domain', 'Work Group CORP Domain', 'GXP'],
    backup_agent: ['VEEAM', 'Acronis'],
    antivirus: ['CS', 'TM', 'McAfee', 'Symantec'],
    category_gxp: ['GxP', 'Non-GxP'],
    status: ['ACTIVE', 'INACTIVE']
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
      setRecords([]);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'plant_location_id',
      'rack_number',
      'server_owner',
      'type_tower_rack_mounted',
      'server_rack_location_area',
      'asset_no',
      'host_name',
      'make',
      'model',
      'serial_no',
      'os',
      'physical_server_host_name',
      'idrac_ilo',
      'ip_address',
      'part_no',
      'application',
      'application_version',
      'application_oem',
      'application_vendor',
      'system_owner',
      'vm_display_name',
      'vm_type',
      'vm_os',
      'vm_version',
      'vm_server_ip',
      'domain_workgroup',
      'windows_activated',
      'backup_agent',
      'antivirus',
      'category_gxp',
      'current_status',
      'server_managed_by',
      'remarks_application_usage',
      'start_date',
      'end_date',
      'aging',
      'environment',
      'server_critility',
      'database_appplication',
      'current_rpo',
      'reduce_rpo_time',
      'server_to_so_timeline',
      'purchase_date',
      'purchase_po',
      'warranty_new_start_date',
      'amc_warranty_expiry_date',
      'sap_asset_no',
      'amc_vendor',
      'remarks',
      'status'
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, 'Server Inventory Template');
    XLSX.writeFile(wb, 'server_inventory_template.xlsx');
  };

  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    // Check required fields
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

    // Validate dropdown options
    Object.keys(validOptions).forEach(field => {
      if (data[field] && !validOptions[field].includes(data[field])) {
        errors.push({
          row: rowNumber,
          field,
          message: `Invalid value for ${field}. Must be one of: ${validOptions[field].join(', ')}`,
          value: data[field]
        });
      }
    });

    // Validate numeric fields
    const numericFields = ['plant_location_id', 'purchase_po', 'windows_activated'];
    numericFields.forEach(field => {
      if (data[field] && data[field] !== '' && isNaN(Number(data[field]))) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} must be a number`,
          value: data[field]
        });
      }
    });

    // Validate boolean fields
    const booleanFields = [
      'part_no',
      'server_managed_by',
      'current_rpo',
      'sap_asset_no',
      'amc_vendor'
    ];
    
    booleanFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== '') {
        const val = String(data[field]).toLowerCase();
        if (!['true', 'false', 'yes', 'no', '1', '0'].includes(val)) {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} must be true/false or yes/no`,
            value: data[field]
          });
        }
      }
    });

    // Validate date fields
    const dateFields = ['start_date', 'end_date', 'purchase_date', 'warranty_new_start_date', 'amc_warranty_expiry_date'];
    dateFields.forEach(field => {
      if (data[field] && data[field] !== '') {
        const date = new Date(data[field]);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} must be a valid date`,
            value: data[field]
          });
        }
      }
    });

    // Virtual server validation
    if (data.vm_type === 'Virtual') {
      const virtualFields = ['physical_server_host_name', 'vm_display_name', 'vm_os'];
      virtualFields.forEach(field => {
        if (!data[field] || data[field] === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} is required for Virtual servers`,
            value: data[field]
          });
        }
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

      setRecords(validatedRecords);
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
      const response = await fetch(`${API_BASE}/api/servers/import`, {
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

      const result = await response.json();
      
      alert(`Import successful! ${validRecords.length} records submitted for approval.`);
      navigate('/server-master');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing records. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Server Inventory" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import Server Inventory from Excel</h2>
            <p>Upload an Excel file to bulk import server inventory records</p>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Template Download */}
            <div style={{ marginBottom: '30px' }}>
              <h3>Step 1: Download Template</h3>
              <button 
                className={styles.saveBtn}
                onClick={downloadTemplate}
                style={{ marginTop: '10px' }}
              >
                Download Excel Template
              </button>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '30px' }}>
              <h3>Step 2: Upload File</h3>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ marginTop: '10px' }}
              />
              {file && <p style={{ marginTop: '10px', color: '#22c55e' }}>Selected: {file.name}</p>}
            </div>

            {/* Validate Button */}
            <div style={{ marginBottom: '30px' }}>
              <h3>Step 3: Validate Data</h3>
              <button
                className={styles.saveBtn}
                onClick={handleValidate}
                disabled={!file || validating}
                style={{ marginTop: '10px' }}
              >
                {validating ? 'Validating...' : 'Validate File'}
              </button>
            </div>

            {/* Validation Results */}
            {showResults && (
              <div style={{ marginBottom: '30px' }}>
                <h3>Validation Results</h3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px',
                  marginTop: '20px'
                }}>
                  <div style={{ 
                    padding: '20px', 
                    background: '#f0fdf4', 
                    borderRadius: '8px',
                    border: '1px solid #22c55e'
                  }}>
                    <h4 style={{ color: '#22c55e', margin: '0 0 10px 0' }}>
                      ✓ Valid Records: {validRecords.length}
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      These records will be imported
                    </p>
                  </div>

                  <div style={{ 
                    padding: '20px', 
                    background: '#fef2f2', 
                    borderRadius: '8px',
                    border: '1px solid #ef4444'
                  }}>
                    <h4 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>
                      ✗ Invalid Records: {invalidRecords.length}
                    </h4>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      These records have validation errors
                    </p>
                  </div>
                </div>

                {/* Error Details */}
                {invalidRecords.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>Validation Errors:</h4>
                    <div style={{ 
                      maxHeight: '300px', 
                      overflow: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginTop: '10px'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Row</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Field</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Error</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invalidRecords.flatMap((record: ImportRecord) => 
                            record.errors.map((error: ValidationError, idx: number) => (
                              <tr key={`${record.rowNumber}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '12px' }}>{error.row}</td>
                                <td style={{ padding: '12px' }}>{error.field}</td>
                                <td style={{ padding: '12px', color: '#ef4444' }}>{error.message}</td>
                                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{String(error.value)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Button */}
                {validRecords.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>Step 4: Import Valid Records</h3>
                    <button
                      className={styles.saveBtn}
                      onClick={handleImport}
                      disabled={importing}
                      style={{ marginTop: '10px' }}
                    >
                      {importing ? 'Importing...' : `Import ${validRecords.length} Records`}
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                      Records will be submitted for approval before being added to the system.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cancel Button */}
            <div style={{ marginTop: '30px' }}>
              <button
                className={styles.cancelBtn}
                onClick={() => navigate('/server-master')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportServerInventory;