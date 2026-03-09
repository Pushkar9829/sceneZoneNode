const ArtistPerformanceGallery = require("../../../Artist/models/Profile/performanceGalleryArtist");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const ArtistAuthentication = require("../../../Artist/models/Auth/Auth");
const { uploadImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

/**
 * Admin: get all performance videos for an artist by artistId
 */
exports.getArtistPerformancesByAdmin = async (req, res) => {
  try {
    const { artistId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artist ID",
      });
    }
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found",
      });
    }
    const performances = await ArtistPerformanceGallery.find(
      { artistId },
      "artistProfileId venueName genre videoUrl"
    ).lean();
    return apiResponse(res, {
      success: true,
      statusCode: 200,
      message: "Performance gallery fetched",
      data: performances,
    });
  } catch (err) {
    console.error("Get artist performances (admin) error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

/**
 * Admin: add a performance video for an artist
 * Body: venueName, genre. File: video (multipart)
 */
exports.createArtistPerformanceByAdmin = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { venueName, genre } = req.body;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Invalid artist ID",
      });
    }

    if (!venueName || !genre) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Venue name and genre are required",
      });
    }

    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Artist not found",
      });
    }

    if (!req.file) {
      return apiResponse(res, {
        success: false,
        statusCode: 400,
        message: "Performance video file is required",
      });
    }

    const artistProfile = await ArtistProfile.findOne({ artistId });
    const fileName = `Artist/performanceGallery/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
    const videoUrl = await uploadImage(req.file, fileName);

    const newPerformance = new ArtistPerformanceGallery({
      artistId,
      artistProfileId: artistProfile ? artistProfile._id : null,
      venueName: String(venueName).trim(),
      genre: String(genre).trim(),
      videoUrl,
    });
    await newPerformance.save();

    if (artistProfile) {
      const currentIds = artistProfile.performanceUrlId || [];
      if (!currentIds.some((id) => id.toString() === newPerformance._id.toString())) {
        artistProfile.performanceUrlId = [...currentIds, newPerformance._id];
        await artistProfile.save();
      }
    }

    return apiResponse(res, {
      success: true,
      statusCode: 201,
      message: "Performance video added successfully",
      data: newPerformance,
    });
  } catch (err) {
    console.error("Create artist performance (admin) error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};
