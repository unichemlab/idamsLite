// const express = require("express");
// const router = express.Router();
// const authController = require("../controllers/authController");

// router.post("/login", authController.login);
// router.post("/logout", authController.logout);
// router.get("/permissions", authController.getPermissions);

// module.exports = router;

const express    = require("express");
const router     = express.Router();
const authCtrl   = require("../controllers/authController");
const  authorize  = require("../middleware/authorize"); // your existing JWT middleware

router.post("/login",      authCtrl.login);
router.post("/logout",     authorize(), authCtrl.logout);
router.post("/heartbeat",  authorize(), authCtrl.heartbeat);   // authorize adds req.user.session_id fallback
router.get ("/permissions", authCtrl.getPermissions);

module.exports = router;