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

const ImportSystemInventory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Required fields for system inventory
  const requiredFields = [
    'plant_location_id',
    'department_id',
    'type_of_asset',
    'architecture',
    'category_gxp',
    'connected_through',
    'ip_address_type',
    'application_onboard',
    'system_running_with',
    'system_managed_by',
    'backup_type',
    'backup_frequency_days',
    'warranty_status'
  ];

  // Valid options for dropdown fields
  const validOptions: Record<string, string[]> = {
    type_of_asset: ['Desktop', 'Laptop', 'Toughbook', 'HMI', 'SCADA', 'IPC', 'TABs', 'Scanner', 'Printer'],
    architecture: ['32 bit', '64 bit'],
    category_gxp: ['GxP', 'Non-GxP', 'Network'],
    connected_through: ['LAN', 'WiFi'],
    ip_address_type: ['Static', 'DHCP', 'Other'],
    application_onboard: ['Manual', 'Automated'],
    system_running_with: ['Active Directory', 'Local'],
    system_managed_by: ['Information Technology', 'Engineering'],
    backup_type: ['Manual', 'Auto', 'Commvault Client Of Server'],
    backup_frequency_days: ['Weekly', 'Fothnight', 'Monthly', 'Yearly'],
    warranty_status: ['Under Warranty', 'Out Of Warranty'],
    system_current_status: ['Validated', 'Retired'],
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
      'user_location',
      'building_location',
      'department_id',
      'allocated_to_user_name',
      'host_name',
      'make',
      'model',
      'serial_no',
      'processor',
      'ram_capacity',
      'hdd_capacity',
      'ip_address',
      'other_software',
      'windows_activated',
      'os_version_service_pack',
      'architecture',
      'type_of_asset',
      'category_gxp',
      'gamp_category',
      'instrument_equipment_name',
      'equipment_instrument_id',
      'instrument_owner',
      'service_tag',
      'warranty_status',
      'warranty_end_date',
      'connected_no_of_equipments',
      'application_name',
      'application_version',
      'application_oem',
      'application_vendor',
      'user_management_applicable',
      'application_onboard',
      'system_process_owner',
      'database_version',
      'domain_workgroup',
      'connected_through',
      'specific_vlan',
      'ip_address_type',
      'date_time_sync_available',
      'antivirus',
      'antivirus_version',
      'backup_type',
      'backup_frequency_days',
      'backup_path',
      'backup_tool',
      'backup_procedure_available',
      'folder_deletion_restriction',
      'remote_tool_available',
      'os_administrator',
      'system_running_with',
      'audit_trail_adequacy',
      'user_roles_availability',
      'user_roles_challenged',
      'system_managed_by',
      'planned_upgrade_fy2526',
      'eol_eos_upgrade_status',
      'system_current_status',
      'purchase_po',
      'purchase_vendor_name',
      'amc_vendor_name',
      'renewal_po',
      'warranty_period',
      'amc_start_date',
      'amc_expiry_date',
      'sap_asset_no',
      'remarks',
      'status'
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, 'System Inventory Template');
    XLSX.writeFile(wb, 'system_inventory_template.xlsx');
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
    const numericFields = ['plant_location_id', 'department_id', 'connected_no_of_equipments'];
    numericFields.forEach(field => {
      if (data[field] && isNaN(Number(data[field]))) {
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
      'windows_activated',
      'user_management_applicable',
      'date_time_sync_available',
      'backup_procedure_available',
      'folder_deletion_restriction',
      'remote_tool_available',
      'user_roles_availability',
      'user_roles_challenged',
      'planned_upgrade_fy2526'
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
    const dateFields = ['warranty_end_date', 'amc_start_date', 'amc_expiry_date'];
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
        validateRecord(row, index + 2) // +2 because Excel rows start at 1 and we have header
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
      const response = await fetch(`${API_BASE}/api/systems/import`, {
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
      navigate('/system-master');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing records. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import System Inventory" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import System Inventory from Excel</h2>
            <p>Upload an Excel file to bulk import system inventory records</p>
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
                onClick={() => navigate('/system-master')}
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

export default ImportSystemInventory;