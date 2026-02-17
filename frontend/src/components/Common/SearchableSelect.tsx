// src/components/Common/SearchableSelect.tsx
import React from "react";
import Select from "react-select";

export interface UserOption {
  value: string | number; // user ID
  label: string;          // display label
  user?: any;             // optional original user object
}

interface Props {
  options: UserOption[];
  value?: string | number;  // selected user ID
  onChange: (value: string | number) => void; // saves ID
  placeholder?: string;
  isDisabled?: boolean;
}

const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isDisabled = false,
}) => {
  const selected = options.find((o) => o.value === value) || null;

  return (
    <Select
      options={options}
      value={selected}
      onChange={(option) => option && onChange(option.value)}
      isSearchable
      placeholder={placeholder}
      isDisabled={isDisabled}
      menuPortalTarget={document.body}
      styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
      filterOption={(option, input) =>
        option.label.toLowerCase().includes(input.toLowerCase())
      }
    />
  );
};

export default SearchableSelect;
