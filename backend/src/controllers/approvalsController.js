const db = require("../config/db");
const { logActivity } = require("../utils/activityLogger");

// Helper to get user request details
async function getUserRequestById(userRequestId) {
  const q = `SELECT * FROM user_requests WHERE id = $1`;
  const { rows } = await db.query(q, [userRequestId]);
  return rows[0];
}

// Helper to get task details by user_request_id
async function getTasksByUserRequestId(userRequestId) {
  const q = `SELECT * FROM task_requests WHERE user_request_id = $1`;
  const { rows } = await db.query(q, [userRequestId]);
  return rows;
}

// Approve request by user_requests.id
exports.approveByTransaction = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { transaction: userRequestId } = req.params;
    const { approver_id, comments } = req.body;

    if (!userRequestId)
      return res.status(400).json({ error: "User request ID required" });

    // Get the approver details from the authenticated user (req.user) or from user_master
    let approverName = null;
    let approverEmail = null;
    
    // Prefer req.user if available (from JWT token)
    if (req.user && req.user.email) {
      approverEmail = req.user.email;
      approverName = req.user.employee_name || req.user.name || req.user.username;
    } else if (approver_id) {
      // Fallback to querying user_master
      const approverResult = await client.query(
        `SELECT employee_name, email FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName = approverResult.rows[0].employee_name;
        approverEmail = approverResult.rows[0].email;
      }
    }

    if (!approverEmail) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Approver email not found" });
    }

    console.log("Approver attempting action:", { approverEmail, approverName, approver_id });

    // Get the user request to determine which approver level this is
    const userRequest = await getUserRequestById(userRequestId);
    if (!userRequest) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User request not found" });
    }

    console.log("User request approvers:", {
      approver1_email: userRequest.approver1_email,
      approver2_email: userRequest.approver2_email,
      approver1_status: userRequest.approver1_status,
      approver2_status: userRequest.approver2_status,
    });

    // Determine if this is approver 1
    const isApprover1 = userRequest.approver1_email?.toLowerCase() === approverEmail?.toLowerCase();
    
    // Determine if this is approver 2 by checking workflow
    let isApprover2 = false;
    if (!isApprover1 && userRequest.approver1_status === 'Approved') {
      // Get the location/plant from task_requests
      const taskResult = await client.query(
        `SELECT location FROM task_requests WHERE user_request_id = $1 LIMIT 1`,
        [userRequestId]
      );
      
      if (taskResult.rows.length > 0) {
        const plantId = taskResult.rows[0].location;
        
        // Check if current user is in approver_2_id for this plant
        const workflowResult = await client.query(
          `SELECT approver_2_id FROM approval_workflow_master 
           WHERE plant_id = $1 AND is_active = true`,
          [plantId]
        );
        
        if (workflowResult.rows.length > 0) {
          const approver2Ids = workflowResult.rows[0].approver_2_id;
          // approver_2_id is stored as comma-separated string like "1827,1426"
          const approver2IdArray = approver2Ids ? approver2Ids.split(',').map(id => id.trim()) : [];
          isApprover2 = approver2IdArray.includes(String(approver_id || req.user?.id));
          
          console.log("Approver 2 check:", {
            plantId,
            approver2Ids,
            approver2IdArray,
            currentApproverId: approver_id || req.user?.id,
            isApprover2
          });
        }
      }
    }

    console.log("Authorization check:", { isApprover1, isApprover2 });

    if (!isApprover1 && !isApprover2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        error: "You are not authorized to approve this request",
        details: {
          yourEmail: approverEmail,
          approver1Email: userRequest.approver1_email,
          isApprover1,
          isApprover2,
          approver1Status: userRequest.approver1_status
        }
      });
    }

    // Check approval logic
    if (isApprover2 && userRequest.approver1_status !== 'Approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Approver 1 must approve before Approver 2 can act" 
      });
    }

    // Check if approver 2 has already acted (someone from the pool already approved/rejected)
    if (isApprover2 && userRequest.approver2_status && userRequest.approver2_status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `This request has already been ${userRequest.approver2_status.toLowerCase()} by another Approver 2`,
        actedBy: userRequest.approver2_email
      });
    }

    // Check if approver 2 has already acted (someone from the pool already approved/rejected)
    if (isApprover2 && userRequest.approver2_status && userRequest.approver2_status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `This request has already been ${userRequest.approver2_status.toLowerCase()} by another Approver 2`,
        actedBy: userRequest.approver2_email
      });
    }

    // Get old state for logging
    const oldTasks = await getTasksByUserRequestId(userRequestId);

    // Update user_requests table
    let userRequestUpdateQuery;
    let userRequestParams;
    
    if (isApprover1) {
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver1_status = 'Approved',
            updated_on = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId];
    } else     if (isApprover2) {
      // If approver 2 approves, set their email and complete the request
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver2_status = 'Approved',
            approver2_email = $2,
            status = 'Completed',
            completed_at = NOW(),
            updated_on = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId, approverEmail];
    }

    const { rows: [updatedUserRequest] } = await client.query(
      userRequestUpdateQuery, 
      userRequestParams
    );

    // Update task_requests table
    let taskUpdateQuery;
    let taskParams;
    
    if (isApprover1) {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver1_action = 'Approved',
            approver1_action_timestamp = NOW(),
            approver1_name = $1,
            approver1_comments = $2,
            updated_on = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments || null, userRequestId];
    } else     if (isApprover2) {
      // Approver 2 approval - also update task_status to Approved and set approver2_email, approver2_id, and approver2_name
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver2_action = 'Approved',
            approver2_action_timestamp = NOW(),
            approver2_name = $1,
            approver2_email = $4,
            approver2_id = $5,
            approver2_comments = $2,
            task_status = 'Approved',
            remarks = $2,
            updated_on = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments || null, userRequestId, approverEmail, approver_id || req.user?.id];
    }

    const { rows: updatedTasks } = await client.query(taskUpdateQuery, taskParams);

    // Log the approval action
    await logActivity({
      userId: req.user?.id || approver_id,
      module: "approvals",
      tableName: "user_requests",
      recordId: userRequestId,
      action: "approve",
      oldValue: userRequest,
      newValue: updatedUserRequest,
      comments: `Request approved by ${approverName || `Approver ${approver_id}`} (Level ${isApprover1 ? 1 : 2}) with comment: ${comments || "No comment provided"}`,
      reqMeta: req._meta,
    });

    // Log each task update
    for (const task of updatedTasks) {
      const oldTask = oldTasks.find((t) => t.id === task.id);
      await logActivity({
        userId: req.user?.id || approver_id,
        module: "approvals",
        tableName: "task_requests",
        recordId: task.id,
        action: "approve",
        oldValue: oldTask,
        newValue: task,
        comments: `Task approved by ${approverName || `Approver ${approver_id}`} (Level ${isApprover1 ? 1 : 2})`,
        reqMeta: req._meta,
      });
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Approved by ${isApprover1 ? 'Approver 1' : 'Approver 2'}`,
      userRequest: updatedUserRequest,
      tasksUpdated: updatedTasks.length,
      tasks: updatedTasks 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("[APPROVALS APPROVE ERROR]", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Reject request by user_requests.id
exports.rejectByTransaction = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { transaction: userRequestId } = req.params;
    const { approver_id, comments } = req.body;

    if (!userRequestId)
      return res.status(400).json({ error: "User request ID required" });

    if (!comments || comments.trim() === '') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Comments are required for rejection" });
    }

    // Get the approver details from the authenticated user (req.user) or from user_master
    let approverName = null;
    let approverEmail = null;
    
    // Prefer req.user if available (from JWT token)
    if (req.user && req.user.email) {
      approverEmail = req.user.email;
      approverName = req.user.employee_name || req.user.name || req.user.username;
    } else if (approver_id) {
      // Fallback to querying user_master
      const approverResult = await client.query(
        `SELECT employee_name, email FROM user_master WHERE id = $1`,
        [approver_id]
      );
      if (approverResult.rows.length > 0) {
        approverName = approverResult.rows[0].employee_name;
        approverEmail = approverResult.rows[0].email;
      }
    }

    if (!approverEmail) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Approver email not found" });
    }

    console.log("Approver attempting rejection:", { approverEmail, approverName, approver_id });

    // Get the user request to determine which approver level this is
    const userRequest = await getUserRequestById(userRequestId);
    if (!userRequest) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User request not found" });
    }

    console.log("User request approvers:", {
      approver1_email: userRequest.approver1_email,
      approver2_email: userRequest.approver2_email,
      approver1_status: userRequest.approver1_status,
      approver2_status: userRequest.approver2_status,
    });

    // Determine if this is approver 1
    const isApprover1 = userRequest.approver1_email?.toLowerCase() === approverEmail?.toLowerCase();
    
    // Determine if this is approver 2 by checking workflow
    let isApprover2 = false;
    if (!isApprover1 && userRequest.approver1_status === 'Approved') {
      // Get the location/plant from task_requests
      const taskResult = await client.query(
        `SELECT location FROM task_requests WHERE user_request_id = $1 LIMIT 1`,
        [userRequestId]
      );
      
      if (taskResult.rows.length > 0) {
        const plantId = taskResult.rows[0].location;
        
        // Check if current user is in approver_2_id for this plant
        const workflowResult = await client.query(
          `SELECT approver_2_id FROM approval_workflow_master 
           WHERE plant_id = $1 AND is_active = true`,
          [plantId]
        );
        
        if (workflowResult.rows.length > 0) {
          const approver2Ids = workflowResult.rows[0].approver_2_id;
          // approver_2_id is stored as comma-separated string like "1827,1426"
          const approver2IdArray = approver2Ids ? approver2Ids.split(',').map(id => id.trim()) : [];
          isApprover2 = approver2IdArray.includes(String(approver_id || req.user?.id));
          
          console.log("Approver 2 check:", {
            plantId,
            approver2Ids,
            approver2IdArray,
            currentApproverId: approver_id || req.user?.id,
            isApprover2
          });
        }
      }
    }

    console.log("Authorization check:", { isApprover1, isApprover2 });

    if (!isApprover1 && !isApprover2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        error: "You are not authorized to reject this request",
        details: {
          yourEmail: approverEmail,
          approver1Email: userRequest.approver1_email,
          isApprover1,
          isApprover2,
          approver1Status: userRequest.approver1_status
        }
      });
    }

    // Check approval logic
    if (isApprover2 && userRequest.approver1_status !== 'Approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Approver 1 must approve before Approver 2 can act" 
      });
    }

    // Get old state for logging
    const oldTasks = await getTasksByUserRequestId(userRequestId);

    // Update user_requests table
    let userRequestUpdateQuery;
    let userRequestParams;
    
    if (isApprover1) {
      // If approver 1 rejects, the entire request is rejected
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver1_status = 'Rejected',
            status = 'Rejected',
            updated_on = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId];
    } else     if (isApprover2) {
      // If approver 2 rejects, set their email and reject the entire request
      userRequestUpdateQuery = `
        UPDATE user_requests 
        SET approver2_status = 'Rejected',
            approver2_email = $2,
            status = 'Rejected',
            updated_on = NOW()
        WHERE id = $1 
        RETURNING *`;
      userRequestParams = [userRequestId, approverEmail];
    }

    const { rows: [updatedUserRequest] } = await client.query(
      userRequestUpdateQuery, 
      userRequestParams
    );

    // Update task_requests table
    let taskUpdateQuery;
    let taskParams;
    
    if (isApprover1) {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver1_action = 'Rejected',
            approver1_action_timestamp = NOW(),
            approver1_name = $1,
            approver1_comments = $2,
            task_status = 'Rejected',
            remarks = $2,
            updated_on = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments, userRequestId];
    } else     if (isApprover2) {
      taskUpdateQuery = `
        UPDATE task_requests 
        SET approver2_action = 'Rejected',
            approver2_action_timestamp = NOW(),
            approver2_name = $1,
            approver2_email = $4,
            approver2_id = $5,
            approver2_comments = $2,
            task_status = 'Rejected',
            remarks = $2,
            updated_on = NOW()
        WHERE user_request_id = $3 
        RETURNING *`;
      taskParams = [approverName, comments, userRequestId, approverEmail, approver_id || req.user?.id];
    }

    const { rows: updatedTasks } = await client.query(taskUpdateQuery, taskParams);

    // Log the rejection action
    await logActivity({
      userId: req.user?.id || approver_id,
      module: "approvals",
      tableName: "user_requests",
      recordId: userRequestId,
      action: "reject",
      oldValue: userRequest,
      newValue: updatedUserRequest,
      comments: `Request rejected by ${approverName || `Approver ${approver_id}`} (Level ${isApprover1 ? 1 : 2}) with reason: ${comments}`,
      reqMeta: req._meta,
    });

    // Log each task update
    for (const task of updatedTasks) {
      const oldTask = oldTasks.find((t) => t.id === task.id);
      await logActivity({
        userId: req.user?.id || approver_id,
        module: "approvals",
        tableName: "task_requests",
        recordId: task.id,
        action: "reject",
        oldValue: oldTask,
        newValue: task,
        comments: `Task rejected by ${approverName || `Approver ${approver_id}`} (Level ${isApprover1 ? 1 : 2})`,
        reqMeta: req._meta,
      });
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Rejected by ${isApprover1 ? 'Approver 1' : 'Approver 2'}`,
      userRequest: updatedUserRequest,
      tasksUpdated: updatedTasks.length,
      tasks: updatedTasks 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("[APPROVALS REJECT ERROR]", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};