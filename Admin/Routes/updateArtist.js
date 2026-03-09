const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { updateArtistByAdmin } = require("../controllers/updateArtist/updateArtist");
const {
  getArtistPerformancesByAdmin,
  createArtistPerformanceByAdmin,
} = require("../controllers/artistPerformance/artistPerformance");

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.patch(
  "/update-artist/:artistId",
  authMiddleware(["admin"]),
  updateArtistByAdmin
);

router.get(
  "/artist/:artistId/performances",
  authMiddleware(["admin"]),
  getArtistPerformancesByAdmin
);

router.post(
  "/artist/:artistId/performance",
  authMiddleware(["admin"]),
  upload.single("video"),
  createArtistPerformanceByAdmin
);

module.exports = router;
