const express = require("express");
const router = express.Router();
const { defineAbilitiesFor } = require("../shared/abilities");
const { PagePermissions } = require("../config/pagePermissions");

// Middleware: Require Auth
const auth = require("../middleware/auth");

// GET /api/permissions/inspect
router.get("/inspect", auth, (req, res) => {
  try {
    const user = req.user;

    const ability = defineAbilitiesFor(user);

    // Evaluate page-wise permission access
    const pageResults = Object.entries(PagePermissions).map(
      ([pageName, perm]) => ({
        page: pageName,
        action: perm.action,
        subject: perm.subject,
        allowed: ability.can(perm.action, perm.subject),
      })
    );

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
      },
      rules: ability.rules,
      page_permissions: pageResults,
    });
  } catch (error) {
    console.error("Permission Inspector Error:", error);
    res.status(500).json({ error: "Internal Error" });
  }
});

module.exports = router;
