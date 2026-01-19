import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../../components/Common/AppHeader";
import { useAuth } from "../../context/AuthContext";
import styles from "../Plant/AddPlantMaster.module.css";
import { API_BASE } from "../../utils/api";
import ExcelJS from 'exceljs';
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

interface Plant {
  id: number;
  plant_name: string;
}

interface Department {
  id: number;
  department_name: string;
}

interface Role {
  id: number;
  role_name: string;
}

const ImportApplication: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validRecords, setValidRecords] = useState<any[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const requiredFields = [
    'plant_location_id',
    'department_id',
    'application_hmi_name',
    'display_name'
  ];

  const validOptions: Record<string, string[]> = {
    application_hmi_type: ['Web-Based', 'Desktop', 'Mobile'],
    status: ['ACTIVE', 'INACTIVE'],
    multiple_role_access: ['true', 'false', 'yes', 'no', '1', '0'],
    role_lock: ['true', 'false', 'yes', 'no', '1', '0']
  };

  // Fetch plants and departments on component mount
  useEffect(() => {
    fetchPlantsAndDepartments();
  }, []);

  const fetchPlantsAndDepartments = async () => {
    setLoading(true);
    try {
      const [plantsResponse, departmentsResponse, rolesResponse] = await Promise.all([
        fetch(`${API_BASE}/api/plants`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${API_BASE}/api/departments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${API_BASE}/api/roles`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (plantsResponse.ok) {
        const plantsData = await plantsResponse.json();
        setPlants(plantsData);
      }

      if (departmentsResponse.ok) {
        const departmentsData = await departmentsResponse.json();
        setDepartments(departmentsData);
      }

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Error fetching plants/departments/roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setShowResults(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Create main worksheet
      const worksheet = workbook.addWorksheet('Application Template');
      
      // Add headers
      worksheet.columns = [
        { header: 'plant_location_id', key: 'plant_location_id', width: 35 },
        { header: 'department_id', key: 'department_id', width: 35 },
        { header: 'application_hmi_name', key: 'application_hmi_name', width: 25 },
        { header: 'application_hmi_version', key: 'application_hmi_version', width: 22 },
        { header: 'equipment_instrument_id', key: 'equipment_instrument_id', width: 22 },
        { header: 'application_hmi_type', key: 'application_hmi_type', width: 22 },
        { header: 'display_name', key: 'display_name', width: 25 },
        { header: 'role_id', key: 'role_id', width: 15 },
        { header: 'system_name', key: 'system_name', width: 25 },
        { header: 'system_inventory_id', key: 'system_inventory_id', width: 20 },
        { header: 'multiple_role_access', key: 'multiple_role_access', width: 22 },
        { header: 'role_lock', key: 'role_lock', width: 15 },
        { header: 'status', key: 'status', width: 12 }
      ];

      // Add sample data
      worksheet.addRow({
        plant_location_id: plants.length > 0 ? `${plants[0].id} - ${plants[0].plant_name}` : '',
        department_id: departments.length > 0 ? `${departments[0].id} - ${departments[0].department_name}` : '',
        application_hmi_name: 'SAP ERP',
        application_hmi_version: 'v1.0',
        equipment_instrument_id: 'EQP-001',
        application_hmi_type: 'Application',
        display_name: 'SAP Production',
        role_id: '1,2,3',
        system_name: 'Production System',
        system_inventory_id: '1',
        multiple_role_access: 'true',
        role_lock: 'false',
        status: 'ACTIVE'
      });

      // Create lookup sheet
      const lookupSheet = workbook.addWorksheet('Lookup Data');
      lookupSheet.columns = [
        { header: 'PlantOptions', key: 'plants', width: 40 },
        { header: 'DeptOptions', key: 'depts', width: 40 },
        { header: 'RoleOptions', key: 'roles', width: 30 },
        { header: 'HMIType', key: 'hmi', width: 15 },
        { header: 'RoleAccess', key: 'access', width: 12 },
        { header: 'RoleLock', key: 'lock', width: 12 },
        { header: 'Status', key: 'status', width: 12 }
      ];

      // Add lookup data
      const maxRows = Math.max(plants.length, departments.length, roles.length, 3);
      for (let i = 0; i < maxRows; i++) {
        lookupSheet.addRow({
          plants: plants[i] ? `${plants[i].id} - ${plants[i].plant_name}` : '',
          depts: departments[i] ? `${departments[i].id} - ${departments[i].department_name}` : '',
          roles: roles[i] ? `${roles[i].id} - ${roles[i].role_name}` : '',
          hmi: i === 0 ? 'Application' : i === 1 ? 'HMI':'',
          access: i === 0 ? 'true' : i === 1 ? 'false' : '',
          lock: i === 0 ? 'true' : i === 1 ? 'false' : '',
          status: i === 0 ? 'ACTIVE' : i === 1 ? 'INACTIVE' : ''
        });
      }

      // Add data validation (dropdowns) - ExcelJS supports this properly
      for (let i = 2; i <= 1000; i++) {
        // Column A: Plant dropdown
        if (plants.length > 0) {
          worksheet.getCell(`A${i}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`'Lookup Data'!$A$2:$A$${plants.length + 1}`],
            showErrorMessage: true,
            errorTitle: 'Invalid Plant',
            error: 'Please select a plant from the dropdown'
          };
        }

        // Column B: Department dropdown
        if (departments.length > 0) {
          worksheet.getCell(`B${i}`).dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`'Lookup Data'!$B$2:$B$${departments.length + 1}`],
            showErrorMessage: true,
            errorTitle: 'Invalid Department',
            error: 'Please select a department from the dropdown'
          };
        }

        // Column F: HMI Type dropdown
        worksheet.getCell(`F${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'Lookup Data'!$D$2:$D$4`]
        };

        // Column K: Multiple Role Access dropdown
        worksheet.getCell(`K${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'Lookup Data'!$E$2:$E$3`]
        };

        // Column L: Role Lock dropdown
        worksheet.getCell(`L${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'Lookup Data'!$F$2:$F$3`]
        };

        // Column M: Status dropdown
        worksheet.getCell(`M${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'Lookup Data'!$G$2:$G$3`]
        };
      }

      // Write to file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'application_import_template.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Error creating template. Please try again.');
    }
  };

  const validateRecord = (data: any, rowNumber: number): ImportRecord => {
    const errors: ValidationError[] = [];

    // Extract IDs from "ID - Name" format for plant and department
    let plantId = data.plant_location_id;
    let deptId = data.department_id;

    if (typeof plantId === 'string' && plantId.includes(' - ')) {
      plantId = plantId.split(' - ')[0].trim();
      data.plant_location_id = plantId; // Update the data with just the ID
    }

    if (typeof deptId === 'string' && deptId.includes(' - ')) {
      deptId = deptId.split(' - ')[0].trim();
      data.department_id = deptId; // Update the data with just the ID
    }

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

    // Validate plant_location_id exists in database
    if (data.plant_location_id && plants.length > 0) {
      const plantExists = plants.some(p => p.id === Number(data.plant_location_id));
      if (!plantExists) {
        errors.push({
          row: rowNumber,
          field: 'plant_location_id',
          message: 'Invalid plant_location_id. Must be a valid Plant ID from the database',
          value: data.plant_location_id
        });
      }
    }

    // Validate department_id exists in database
    if (data.department_id && departments.length > 0) {
      const deptExists = departments.some(d => d.id === Number(data.department_id));
      if (!deptExists) {
        errors.push({
          row: rowNumber,
          field: 'department_id',
          message: 'Invalid department_id. Must be a valid Department ID from the database',
          value: data.department_id
        });
      }
    }

    // Validate numeric fields
    const numericFields = ['plant_location_id', 'department_id', 'system_inventory_id'];
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

    // Validate dropdown options
    Object.keys(validOptions).forEach(field => {
      if (data[field] && data[field] !== '') {
        const val = String(data[field]).toLowerCase();
        if (!validOptions[field].map(v => v.toLowerCase()).includes(val)) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid value for ${field}. Must be one of: ${validOptions[field].join(', ')}`,
            value: data[field]
          });
        }
      }
    });

    // Validate role_id format (comma-separated numbers or "ID - Name" format)
    if (data.role_id && data.role_id !== '') {
      const roleString = String(data.role_id);
      let roleIds: string[] = [];

      // Check if it's in "ID - Name, ID - Name" format
      if (roleString.includes(' - ')) {
        roleIds = roleString.split(',').map(r => {
          const trimmed = r.trim();
          return trimmed.split(' - ')[0].trim();
        });
      } else {
        // Regular comma-separated IDs
        roleIds = roleString.split(',').map(r => r.trim());
      }

      // Validate all extracted IDs are numbers
      const invalidRoles = roleIds.filter((r: string) => isNaN(Number(r)));
      if (invalidRoles.length > 0) {
        errors.push({
          row: rowNumber,
          field: 'role_id',
          message: 'role_id must be comma-separated numbers or role selections (e.g., 1,2,3 or "1 - Admin, 2 - User")',
          value: data.role_id
        });
      } else {
        // Update data with just the IDs
        data.role_id = roleIds.join(',');
      }
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
      const response = await fetch(`${API_BASE}/api/applications/import`, {
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
      navigate('/application-masters');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing records. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <AppHeader title="Import Applications" />
      
      <div className={styles.contentArea}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Import Applications from Excel</h2>
            <p>Upload an Excel file to bulk import application records</p>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h3>Step 1: Download Template</h3>
              <button 
                className={styles.saveBtn} 
                onClick={downloadTemplate} 
                disabled={loading || plants.length === 0 || departments.length === 0 || roles.length === 0}
                style={{ marginTop: '10px' }}
              >
                {loading ? 'Loading...' : 'Download Excel Template'}
              </button>
              {loading && (
                <p style={{ marginTop: '10px', color: '#6b7280' }}>Loading plants, departments, and roles...</p>
              )}
              {!loading && (plants.length === 0 || departments.length === 0 || roles.length === 0) && (
                <p style={{ marginTop: '10px', color: '#ef4444' }}>
                  Unable to load reference data. Please refresh the page.
                </p>
              )}
              <div style={{ marginTop: '10px', padding: '10px', background: '#f0f9ff', borderRadius: '4px' }}>
                <strong>Template Guide:</strong>
                <ul style={{ marginTop: '5px', fontSize: '14px' }}>
                  <li><strong>plant_location_id:</strong> Select from dropdown (shows name, submits ID)</li>
                  <li><strong>department_id:</strong> Select from dropdown (shows name, submits ID)</li>
                  <li><strong>role_id:</strong> Enter comma-separated values from Lookup Data (e.g., "1 - Admin, 2 - User" or "1,2")</li>
                  <li><strong>application_hmi_type:</strong> Web-Based, Desktop, or Mobile</li>
                  <li><strong>multiple_role_access:</strong> true or false</li>
                  <li><strong>role_lock:</strong> true or false</li>
                  <li><strong>status:</strong> ACTIVE or INACTIVE</li>
                </ul>
                <p style={{ marginTop: '10px', fontSize: '14px', fontStyle: 'italic' }}>
                  ✓ All dropdowns are pre-configured and ready to use!<br />
                  ✓ For multiple roles, type comma-separated values (e.g., "1 - Admin, 3 - Manager")<br />
                  ✓ The template includes a "Lookup Data" sheet with all available roles.
                </p>
              </div>
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

                {validRecords.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>Step 4: Import Valid Records</h3>
                    <button className={styles.saveBtn} onClick={handleImport} disabled={importing} style={{ marginTop: '10px' }}>
                      {importing ? 'Importing...' : `Import ${validRecords.length} Records`}
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
                      Records will be submitted for approval before being added to the system.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '30px' }}>
              <button className={styles.cancelBtn} onClick={() => navigate('/application-masters')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportApplication;