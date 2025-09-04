// Centralized form field structure for all steps, for dynamic rendering and API integration

export interface FormField {
  name: string;
  label: string;
  type: "text" | "select" | "checkbox" | "autocomplete" | "password";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  autoSuggest?: boolean;
}

export interface StepForm {
  step: number;
  title: string;
  subTitle?: string;
  fields: FormField[];
}

export const formSteps: StepForm[] = [
  {
    step: 1,
    title: "User Information",
    subTitle: "Please provide basic user information and specify the request type.",
    // Fields for user information step
    fields: [
      {
        name: "userName",
        label: "User Name",
        type: "autocomplete",
        required: true,
        placeholder: "Start typing to search directory...",
        autoSuggest: true,
      },
      {
        name: "employeeCode",
        label: "Employee Code",
        type: "autocomplete",
        required: true,
        placeholder: "Enter or search employee code",
        autoSuggest: true,
      },
      {
        name: "location",
        label: "Location",
        type: "autocomplete",
        required: true,
        placeholder: "Start typing location...",
        autoSuggest: true,
      },
      {
        name: "department",
        label: "Department",
        type: "autocomplete",
        required: true,
        placeholder: "Start typing department...",
        autoSuggest: true,
      },

     
    ],
  },
  {
    step: 2,
    title: "Access Details",
    subTitle: "Select the access types and provide details",
   
    fields: [
      {
        name: "accessTypes",
        label: "Access Request Type",
        type: "select",
        required: true,
        options: [
          "New user creation",
          "Modify access",
          "Activate/enable user access",
          "De-activation/disable user access",
          "Password reset",
          "Account unlock",
          "Bulk de-activation",
          "Bulk new user creation",
        ],
      },
      {
        name: "equipmentId",
        label: "Equipment/Instrument ID",
        type: "autocomplete",
        placeholder: "Enter equipment or instrument ID",
        autoSuggest: true,
      },
      {
        name: "appName",
        label: "Application/Equipment Name",
        type: "autocomplete",
        required: true,
        placeholder: "Start typing application name...",
        autoSuggest: true,
      },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        options: ["Admin", "User", "Viewer"],
      },
      {
        name: "version",
        label: "Application Version",
        type: "select",
        options: ["v1.0", "v2.0"],
      },
      {
        name: "trainingStatus",
        label: "Training Completeness",
        type: "select",
        required: true,
        options: ["Yes - Training completed", "No - Training pending"],
      },
    ],
  },
  {
    step: 3,
    title: "Review & Submit",
    subTitle:"Review your information and provide additional details",
    fields: [], // Review step, no direct fields
  },
  {
    step: 4,
    title: "Generate Credentials",
    fields: [], // Credentials are generated, not input
  },
];
