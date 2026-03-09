const ArtistProfile = require("../../../Artist/models/Profile/profile");
const ArtistAuthentication = require("../../../Artist/models/Auth/Auth");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

/**
 * Admin: update artist profile by artistId.
 * Body: fullName?, email?, dob?, address?, contactNumber?, artistType?, artistSubType?, instrument?, budget?, isCrowdGuarantee?
 */
exports.updateArtistByAdmin = async (req, res) => {
  try {
    const { artistId } = req.params;
    const {
      fullName,
      email,
      dob,
      address,
      contactNumber,
      artistType,
      artistSubType,
      instrument,
      budget,
      isCrowdGuarantee,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid artist ID",
        statusCode: 400,
      });
    }

    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }

    const profile = await ArtistProfile.findOne({ artistId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        message: "Artist profile not found",
        statusCode: 404,
      });
    }

    if (fullName !== undefined && fullName !== null) {
      artist.fullName = String(fullName).trim();
      await artist.save();
    }

    if (email !== undefined && email !== null) {
      const emailTrimmed = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return apiResponse(res, {
          success: false,
          message: "Invalid email format",
          statusCode: 400,
        });
      }
      const existing = await ArtistProfile.findOne({ email: emailTrimmed, artistId: { $ne: artistId } });
      if (existing) {
        return apiResponse(res, {
          success: false,
          message: "Email already in use by another artist",
          statusCode: 400,
        });
      }
      profile.email = emailTrimmed;
    }
    if (dob !== undefined && dob !== null) profile.dob = new Date(dob);
    if (address !== undefined && address !== null) profile.address = String(address).trim();
    if (contactNumber !== undefined) {
      profile.contactNumber = contactNumber && String(contactNumber).trim() ? String(contactNumber).trim() : null;
    }
    if (artistType !== undefined && artistType !== null) {
      profile.artistType = String(artistType).trim();
      profile.artistSubType = artistType === "Musician" && artistSubType ? String(artistSubType).trim() : null;
    }
    if (instrument !== undefined) {
      profile.instrument = instrument && String(instrument).trim() ? String(instrument).trim() : null;
    }
    if (budget !== undefined && budget !== null && budget !== "") {
      const num = Number(budget);
      if (!isNaN(num) && num >= 0) profile.budget = num;
    }
    if (isCrowdGuarantee !== undefined) profile.isCrowdGuarantee = Boolean(isCrowdGuarantee);

    await profile.save();

    const updated = await ArtistProfile.findOne({ artistId })
      .populate("artistId", "fullName mobileNumber")
      .populate("performanceUrlId", "venueName genre videoUrl");

    return apiResponse(res, {
      success: true,
      message: "Artist profile updated successfully",
      data: updated,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error updating artist:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update artist",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
