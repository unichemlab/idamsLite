// Simulate Zing HR API for user active/inactive status
export async function checkUserActiveStatus(
  employeeCode: string
): Promise<"active" | "inactive"> {
  // For demo, alternate status based on code
  if (!employeeCode) return "active";
  return employeeCode.endsWith("5") ? "inactive" : "active";
}
