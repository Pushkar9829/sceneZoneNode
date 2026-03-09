const { getAllAppUsers } = require("../controllers/getAllUsers/allUsers");
const { updateAppUser } = require("../controllers/updateUser/updateUser");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();

router.get("/get-all-users", authMiddleware(["admin"]), getAllAppUsers);
router.patch("/update-user/:userId", authMiddleware(["admin"]), updateAppUser);

module.exports = router;