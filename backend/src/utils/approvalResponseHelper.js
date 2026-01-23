/**
 * Standard approval response formatter
 * Does NOT affect existing logic
 */
function approvalResponse({
  message,
  approvalId,
  data,
}) {
  return {
    message,
    approvalId,
    referenceId: approvalId,   // ✅ popup id
    status: "PENDING_APPROVAL",
    data,
  };
}

module.exports = { approvalResponse };
