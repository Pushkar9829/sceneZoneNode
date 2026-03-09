const Host = require("../../../Host/models/Auth/Auth");
const HostProfile = require("../../../Host/models/Profile/profile");
const Artist = require("../../../Artist/models/Auth/Auth");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

/**
 * Admin: update user details (fullName, email) by userId and role.
 * Body: { role: 'host' | 'artist', fullName?: string, email?: string }
 */
exports.updateAppUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, fullName, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, {
        success: false,
        message: "Invalid user ID",
        statusCode: 400,
      });
    }

    if (!role || !["host", "artist"].includes(role)) {
      return apiResponse(res, {
        success: false,
        message: "Role is required and must be 'host' or 'artist'",
        statusCode: 400,
      });
    }

    if (role === "host") {
      const host = await Host.findById(userId);
      if (!host) {
        return apiResponse(res, {
          success: false,
          message: "Host not found",
          statusCode: 404,
        });
      }
      if (fullName !== undefined && fullName !== null) {
        host.fullName = String(fullName).trim();
        await host.save();
      }
      const hostProfile = await HostProfile.findOne({ hostId: userId });
      if (hostProfile && email !== undefined && email !== null) {
        const emailTrimmed = String(email).trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
          hostProfile.email = emailTrimmed;
          await hostProfile.save();
        }
      }
      return apiResponse(res, {
        success: true,
        message: "User updated successfully",
        data: { _id: host._id, fullName: host.fullName, role: "host" },
        statusCode: 200,
      });
    }

    if (role === "artist") {
      const artist = await Artist.findById(userId);
      if (!artist) {
        return apiResponse(res, {
          success: false,
          message: "Artist not found",
          statusCode: 404,
        });
      }
      if (fullName !== undefined && fullName !== null) {
        artist.fullName = String(fullName).trim();
        await artist.save();
      }
      const artistProfile = await ArtistProfile.findOne({ artistId: userId });
      if (artistProfile && email !== undefined && email !== null) {
        const emailTrimmed = String(email).trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
          const existing = await ArtistProfile.findOne({ email: emailTrimmed, artistId: { $ne: userId } });
          if (existing) {
            return apiResponse(res, {
              success: false,
              message: "Email already in use by another artist",
              statusCode: 400,
            });
          }
          artistProfile.email = emailTrimmed;
          await artistProfile.save();
        }
      }
      return apiResponse(res, {
        success: true,
        message: "User updated successfully",
        data: { _id: artist._id, fullName: artist.fullName, role: "artist" },
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: false,
      message: "Invalid role",
      statusCode: 400,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to update user",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
