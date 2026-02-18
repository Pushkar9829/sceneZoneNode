const ArtistProfile = require("../../models/Profile/profile");
const ArtistAuthentication = require("../../models/Auth/Auth");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");
const ArtistPerformanceGallery = require("../../../Artist/models/Profile/performanceGalleryArtist");
const mongoose = require("mongoose");
const axios = require("axios");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Artist Profile
exports.createArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const {
      fullName,
      dob,
      email,
      address,
      upiId,
      contactNumber,
      artistType,
      artistSubType,
      instrument,
      budget,
      isCrowdGuarantee,
      performanceUrlId,
    } = req.body;

    console.log("[createArtistProfile] Validations - body fields:", {
      hasFullName: !!fullName,
      hasDob: !!dob,
      hasEmail: !!email,
      hasAddress: !!address,
      upiId: upiId != null ? String(upiId).trim() : null,
      hasArtistType: !!artistType,
      hasBudget: budget !== undefined && budget !== null && budget !== "",
      hasContactNumber: !!contactNumber,
    });

    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      console.log("[createArtistProfile] Validation FAIL: Artist not found", artistId);
      return apiResponse(res, {
        success: false,
        message: "Artist not found",
        statusCode: 404,
      });
    }
    console.log("[createArtistProfile] Validation OK: Artist found");

    const existingProfile = await ArtistProfile.findOne({ artistId });
    if (existingProfile) {
      console.log("[createArtistProfile] Validation FAIL: Profile already exists");
      return apiResponse(res, {
        success: false,
        message: "Profile already exists.",
        statusCode: 400,
      });
    }
    console.log("[createArtistProfile] Validation OK: No existing profile");

    if (!dob || !email || !address || !artistType || (budget !== 0 && !budget)) {
      console.log("[createArtistProfile] Validation FAIL: Missing required fields", {
        dob: !!dob,
        email: !!email,
        address: !!address,
        artistType: !!artistType,
        budget,
      });
      return apiResponse(res, {
        success: false,
        message: "Missing required fields: Date of Birth, Email, Address, Artist Type, and Budget are required.",
        statusCode: 400,
      });
    }
    console.log("[createArtistProfile] Validation OK: Required fields present");

    const upiTrimmed = upiId != null ? String(upiId).trim() : "";
    if (!upiTrimmed) {
      console.log("[createArtistProfile] Validation FAIL: UPI ID missing or empty", { upiId });
      return apiResponse(res, {
        success: false,
        message: "UPI ID is required for payouts.",
        statusCode: 400,
      });
    }
    console.log("[createArtistProfile] Validation OK: UPI ID present", { upiTrimmed: upiTrimmed ? `${upiTrimmed.slice(0, 3)}***` : "" });

    // Razorpay validation / skip flow commented out for now - profile saves UPI only
    // const hasRazorpayKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    // const displayName = (fullName && String(fullName).trim()) || artist.fullName || artist.mobileNumber || "Artist";
    let razorpayAccountId = null;
    // const routeNotEnabled = (msg) => /route.*not enabled|route feature not enabled/i.test(String(msg || ""));
    // try {
    //   const account = await razorpay.accounts.create({
    //     email: email.toLowerCase(),
    //     name: displayName,
    //     type: "route",
    //     contact_name: displayName,
    //     business_type: "individual",
    //     bank_details: { vpa: { address: upiTrimmed } },
    //   });
    //   razorpayAccountId = account.id;
    // } catch (rzpErr) {
    //   const rzpMsg = rzpErr.error?.description || rzpErr.message || "";
    //   if (routeNotEnabled(rzpMsg)) {
    //     const skipWhenRouteDisabled = process.env.SKIP_RAZORPAY_WHEN_ROUTE_DISABLED === "true";
    //     if (skipWhenRouteDisabled) razorpayAccountId = null;
    //     else return apiResponse(res, { success: false, message: "Razorpay Route is not enabled...", statusCode: 400 });
    //   } else {
    //     return apiResponse(res, { success: false, message: "Failed to link Razorpay payout account: " + rzpMsg, statusCode: 400 });
    //   }
    // }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("[createArtistProfile] Validation FAIL: Invalid email format", { email });
      return apiResponse(res, {
        success: false,
        message: "Invalid email format",
        statusCode: 400,
      });
    }
    console.log("[createArtistProfile] Validation OK: Email format valid");

    const emailExists = await ArtistProfile.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      console.log("[createArtistProfile] Validation FAIL: Email already exists", { email: email.toLowerCase() });
      return apiResponse(res, {
        success: false,
        message: "Email already exists.",
        statusCode: 400,
      });
    }

    let performanceUrlIds = [];
    if (performanceUrlId) {
      let ids = performanceUrlId;
      if (typeof performanceUrlId === "string") {
        try {
          if (performanceUrlId.startsWith("[") && performanceUrlId.endsWith("]")) {
            ids = JSON.parse(performanceUrlId);
          } else if (mongoose.Types.ObjectId.isValid(performanceUrlId)) {
            ids = [performanceUrlId];
          }
        } catch (err) {
          return apiResponse(res, {
            success: false,
            message: "Invalid performanceUrlId format",
            statusCode: 400,
          });
        }
      }
      performanceUrlIds = Array.isArray(ids) ? ids : [ids];
      for (const id of performanceUrlIds) {
        const performance = await ArtistPerformanceGallery.findById(id);
        if (!performance || performance.artistId.toString() !== artistId.toString()) {
          return apiResponse(res, {
            success: false,
            message: `Performance not found: ${id}`,
            statusCode: 404,
          });
        }
      }
    }

    let profileImageUrl = null;
    if (req.file) {
      const fileName = `Artist/profileImage/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadImage(req.file, fileName);
    }

    const newProfile = new ArtistProfile({
      artistId,
      profileImageUrl: profileImageUrl || undefined,
      dob: new Date(dob),
      email: email.toLowerCase().trim(),
      address: String(address).trim(),
      upiId: String(upiId).trim(),
      contactNumber: contactNumber && String(contactNumber).trim() ? String(contactNumber).trim() : null,
      razorpayAccountId: razorpayAccountId || undefined,
      artistType: String(artistType).trim(),
      artistSubType: artistType === "Musician" && artistSubType ? String(artistSubType).trim() : null,
      instrument: instrument && String(instrument).trim() ? String(instrument).trim() : null,
      budget: Number(budget) || 0,
      isCrowdGuarantee: Boolean(isCrowdGuarantee),
      performanceUrlId: performanceUrlIds,
      status: "pending",
    });

    await newProfile.save();

    await ArtistPerformanceGallery.updateMany(
      { artistId, artistProfileId: null },
      { $set: { artistProfileId: newProfile._id } }
    );

    artist.isProfileComplete = true;
    if (fullName !== undefined && fullName !== null) {
      artist.fullName = String(fullName).trim();
    }
    await artist.save();

    return apiResponse(res, {
      success: true,
      message: "Artist profile created and Razorpay account linked successfully",
      data: newProfile,
      statusCode: 201,
    });
  } catch (err) {
    console.error("Create Artist Profile Error:", err);
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Server error",
      data: { error: err.message },
    });
  }
};

// Update Artist Profile
exports.updateArtistProfile = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const artist = await ArtistAuthentication.findById(artistId);
    if (!artist) {
      return apiResponse(res, { success: false, message: "Artist not found", statusCode: 404 });
    }

    let profile = await ArtistProfile.findOne({ artistId });
    if (!profile) {
      return apiResponse(res, { success: false, message: "Artist profile not found", statusCode: 404 });
    }

    const {
      fullName,
      dob,
      email,
      address,
      contactNumber,
      artistType,
      artistSubType,
      instrument,
      budget,
      isCrowdGuarantee,
      performanceUrlId,
    } = req.body;

    let fieldsUpdated = false;
    if (fullName !== undefined && fullName !== null) {
      artist.fullName = String(fullName).trim();
      await artist.save();
      fieldsUpdated = true;
    }

    if (email && email !== profile.email) {
      profile.email = email.toLowerCase();
      fieldsUpdated = true;
    }
    if (dob) {
      profile.dob = new Date(dob);
      fieldsUpdated = true;
    }
    if (address) {
      profile.address = address.trim();
      fieldsUpdated = true;
    }
    if (contactNumber !== undefined) {
      profile.contactNumber = contactNumber && String(contactNumber).trim() ? String(contactNumber).trim() : null;
      fieldsUpdated = true;
    }
    if (artistType) {
      profile.artistType = artistType;
      profile.artistSubType = artistType === "Musician" ? artistSubType || null : null;
      fieldsUpdated = true;
    }
    if (instrument !== undefined) {
      profile.instrument = instrument && String(instrument).trim() ? String(instrument).trim() : null;
      fieldsUpdated = true;
    }
    if (budget) {
      profile.budget = Number(budget);
      fieldsUpdated = true;
    }
    if (isCrowdGuarantee !== undefined) {
      profile.isCrowdGuarantee = Boolean(isCrowdGuarantee);
      fieldsUpdated = true;
    }

    if (req.file) {
      const fileName = `Artist/profileImage/artist_${artistId}_${Date.now()}-${req.file.originalname}`;
      const newUrl = await uploadImage(req.file, fileName);
      if (profile.profileImageUrl) {
        const oldFile = profile.profileImageUrl.split("/").pop();
        await deleteImage(oldFile);
      }
      profile.profileImageUrl = newUrl;
      fieldsUpdated = true;
    }

    await profile.save();

    return apiResponse(res, {
      success: true,
      message: "Profile updated successfully",
      data: profile,
      statusCode: 200,
    });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error", data: { error: err.message } });
  }
};

exports.getArtistProfile = async (req, res) => {
  try {
    const { artistId } = req.params;
    const profile = await ArtistProfile.findOne({ artistId })
      .populate("artistId")
      .populate("performanceUrlId", "venueName genre videoUrl");

    if (!profile) {
      return apiResponse(res, { success: false, statusCode: 404, message: "Artist profile not found" });
    }

    return apiResponse(res, { success: true, statusCode: 200, message: "Profile fetched", data: profile });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};

exports.verifyArtist = async (req, res) => {
  try {
    const { artistId } = req.params;
    const profile = await ArtistProfile.findOne({ artistId })
      .populate("artistId")
      .populate("performanceUrlId", "venueName genre videoUrl");

    if (!profile) {
      return apiResponse(res, { success: false, statusCode: 404, message: "Artist profile not found" });
    }

    profile.artistId.isVerified = true;
    await profile.artistId.save();

    return apiResponse(res, { success: true, statusCode: 200, message: "Artist Profile Verified", data: profile });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};

exports.getAllArtists = async (req, res) => {
  try {
    const artists = await ArtistProfile.find()
      .populate("artistId")
      .populate("performanceUrlId", "venueName genre videoUrl");

    return apiResponse(res, { success: true, statusCode: 200, message: "Artist profiles fetched", data: artists });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};

exports.deleteArtistProfile = async (req, res) => {
  try {
    const user = req.user;
    let profile = await ArtistProfile.findOne({ artistId: user.artistId });

    if (!profile) return apiResponse(res, { success: false, message: "Profile not found", statusCode: 404 });

    if (profile.profileImageUrl) {
      const fileName = profile.profileImageUrl.split("/").pop();
      await deleteImage(fileName);
    }

    await ArtistPerformanceGallery.updateMany({ artistProfileId: profile._id }, { $set: { artistProfileId: null } });
    const artist = await ArtistAuthentication.findById(profile.artistId);
    if (artist) {
      artist.isProfileComplete = false;
      await artist.save();
    }

    await ArtistProfile.deleteOne({ artistId: profile.artistId });
    return apiResponse(res, { success: true, message: "Profile deleted", statusCode: 200 });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};

exports.getArtistPerformance = async (req, res) => {
  try {
    const { artistId } = req.params;
    const performances = await ArtistPerformanceGallery.find({ artistId }, "artistProfileId venueName genre videoUrl");
    return apiResponse(res, { success: true, statusCode: 200, message: "Gallery fetched", data: performances });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};

exports.setNegotiationStatus = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const { isNegotiaitonAvailable } = req.body;

    if (typeof isNegotiaitonAvailable !== "boolean") {
      return apiResponse(res, { success: false, statusCode: 400, message: "isNegotiaitonAvailable must be a boolean." });
    }

    const profile = await ArtistProfile.findOne({ artistId });
    if (!profile) return apiResponse(res, { success: false, statusCode: 404, message: "Profile not found." });

    profile.isNegotiaitonAvailable = isNegotiaitonAvailable;
    await profile.save();

    return apiResponse(res, { success: true, statusCode: 200, message: "Status updated", data: profile });
  } catch (err) {
    return apiResponse(res, { success: false, statusCode: 500, message: "Server error" });
  }
};