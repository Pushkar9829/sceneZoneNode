const HostProfile = require("../../models/Profile/profile");
const HostAuthentication = require("../../models/Auth/Auth");
const { uploadImage, deleteImage } = require("../../../utils/s3Functions");
const { apiResponse } = require("../../../utils/apiResponse");

exports.createHostProfile = async (req, res) => {
  console.log('[createHostProfile] Starting createHostProfile');
  console.log('[createHostProfile] Request user:', req.user);
  console.log('[createHostProfile] Request body:', req.body);
  console.log('[createHostProfile] Request file:', req.file ? req.file.originalname : null);

  try {
    const hostId = req.user?.hostId; // Get hostId from the token
    console.log('[createHostProfile] Extracted hostId:', hostId);

    if (!hostId) {
      console.log('[createHostProfile] Validation failed: No hostId provided');
      return apiResponse(res, { success: false, message: 'Unauthorized access', statusCode: 401 });
    }

    const { email, fullName, location} = req.body;
    console.log('[createHostProfile] Extracted fields:', { email, fullName,location});

    // Validate required fields
    if (!email || !fullName || !location) {
      console.log('[createHostProfile] Validation failed: Missing required fields');
      return apiResponse(res, { success: false, message: 'Missing required fields', statusCode: 400 });
    }

    // Find the host in the HostAuthentication model
    console.log('[createHostProfile] Querying HostAuthentication for hostId:', hostId);
    const host = await HostAuthentication.findById(hostId);
    if (!host) {
      console.log('[createHostProfile] Host not found for hostId:', hostId);
      return apiResponse(res, { success: false, message: 'Host not found', statusCode: 404 });
    }

    // Check if the host is verified
    if (!host.isVerified) {
      console.log('[createHostProfile] Host is not verified:', hostId);
      return apiResponse(res, { success: false, message: 'Host is not verified. Cannot create profile.', statusCode: 400 });
    }

    // Check if the host already has a profile
    console.log('[createHostProfile] Checking for existing profile for hostId:', hostId);
    const existingProfile = await HostProfile.findOne({ hostId });
    if (existingProfile) {
      console.log('[createHostProfile] Profile already exists for hostId:', hostId);
      return apiResponse(res, { success: false, message: 'Profile already exists for this host', statusCode: 400 });
    }

    // Check if email is already in use
    const emailExists = await HostProfile.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return apiResponse(res, { success: false, message: "Email already in use by another host.", statusCode: 400 });
    }

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      console.log('[createHostProfile] Uploading profile image:', req.file.originalname);
      const fileName = `Host/profileImage/host_${hostId}_${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadImage(req.file, fileName);
      console.log('[createHostProfile] Profile image uploaded, URL:', profileImageUrl);
    } else {
      console.log('[createHostProfile] No profile image provided');
      return apiResponse(res, { success: false, message: 'Profile image is required', statusCode: 400 });
    }

    // Update HostAuthentication (Auth model)
    console.log('[createHostProfile] Updating HostAuthentication with:', { fullName});
    host.isProfileComplete = true; // Set profile as complete
    host.fullName = fullName;
    await host.save();

    // Create new profile
    console.log('[createHostProfile] Creating new HostProfile with:', { hostId, email, location, profileImageUrl });
    const newProfile = new HostProfile({
      hostId,
      email: email.toLowerCase(),
      location,
      profileImageUrl,
      fullName,
    });
    await newProfile.save();
    console.log('[createHostProfile] New profile saved:', newProfile._id);

    // Construct response
    const responseData = {
      ...newProfile.toObject(),
      ...host.toObject(),
      _id: host._id, // Ensure the main host ID is used
      isProfileComplete: host.isProfileComplete,
    };
    delete responseData.password; // Remove password from response

    console.log('[createHostProfile] Sending successful response');
    return apiResponse(res, {
      message: 'Profile created successfully',
      data: responseData,
       statusCode: 201,
    });
  } catch (error) {
    console.error('[createHostProfile] Error occurred:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error creating profile',
      error: error.message,
      statusCode: 500,
    });
  }
};

exports.updateHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;
    console.log("Host ID:", hostId);

    const { fullName, email, location } = req.body || {};
    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
     return apiResponse(res, {
       success: false,
       statusCode: 404,
       message: "Profile not found",
     });
    }

    // Check if the email already exists in another profile
    if (email && email !== profile.email) {
      const emailExists = await HostProfile.findOne({ email });
      if (emailExists) {
        return apiResponse(res, {
          success: false,
          statusCode: 400,
          message:
            "Profile with this email already exists. Use a different one.",
        });
      }
    }

    // Find Host in HostAuthentication
    console.log('[updateHostProfile] Querying UserAuthentication for userId:', hostId);
    const host = await HostAuthentication.findById(hostId);
    console.log('[updateHostProfile] User query result:', host ? { id: host._id} : null);

    if (!host) {
      console.log('[updateHostProfile] Host not found for hostId:', hostId);
      return apiResponse(res, {
        success: false,
        message: 'Host not found',
        statusCode: 404,
      });
    }

    host.fullName = fullName;
    host.save();

    // Update profile fields if provided
    if (email) profile.email = email.toLowerCase();
    if (location) profile.location = location;
    if (fullName) profile.fullName = fullName;

    // Handle profile image update (optional)
    if (req.file) {
      // Upload new profile image
      const newFileName = `Host/profileImage/host_${hostId}_${Date.now()}-${
        req.file.originalname
      }`;
      const newProfileImageUrl = await uploadImage(req.file, newFileName);

      // Delete old profile image if it exists
      if (profile.profileImageUrl) {
        try {
          const oldFileName = profile.profileImageUrl.split(".com/")[1];
          await deleteImage(oldFileName);
        } catch (error) {
          console.warn(
            `Failed to delete old profile image ${profile.profileImageUrl}:`,
            error.message
          );
        }
      }

      profile.profileImageUrl = newProfileImageUrl;
    }

    await profile.save();

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to update profile",
      data: { error: error.message },
    });
  }
};

exports.deleteHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Profile not found",
      });
    }
    // Delete profile image from S3 if it exists
    if (profile.profileImageUrl) {
      try {
        const fileName = profile.profileImageUrl.split(".com/")[1];
        await deleteImage(fileName);
      } catch (error) {
        console.warn(
          `Failed to delete profile image ${profile.profileImageUrl}:`,
          error.message
        );
      }
    }

    // Delete the profile from the database
    await HostProfile.deleteOne({ hostId });
    await HostAuthentication.deleteOne({ _id: hostId });

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to delete profile",
      data: { error: error.message },
    });
  }
};

exports.getHostProfile = async (req, res) => {
  try {
    const hostId = req.user.hostId;

    // Find the host profile
    const profile = await HostProfile.findOne({ hostId });
    if (!profile) {
      return apiResponse(res, {
        success: false,
        statusCode: 404,
        message: "Profile not found",
      });
    }
    console.log("Host profile found:", profile.fullName);

    return apiResponse(res, {
      statusCode: 200,
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      statusCode: 500,
      message: "Failed to fetch profile",
      data: { error: error.message },
    });
  }
};
