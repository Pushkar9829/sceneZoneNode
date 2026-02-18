const express = require("express");
const router = express.Router();
const {authMiddleware} = require("../../middlewares/authMiddleware");
const {
  rateEvent,
} = require("../controllers/Rating/rating");

router.post(
  "/rate-event",
  authMiddleware(["artist"]),
  rateEvent
);

module.exports = router;