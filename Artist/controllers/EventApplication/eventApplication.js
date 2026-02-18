const mongoose = require("mongoose");
const EventApplication = require("../../../Artist/models/EventApplication/eventApplication");
const Event = require("../../../Host/models/Events/event");
const { apiResponse } = require("../../../utils/apiResponse");
const ArtistProfile = require("../../models/Profile/profile");
const NotificationService = require('../../../Notification/controller/notificationService');

exports.applyForEvent = async (req, res) => {
  try {
    console.log("Starting applyForEvent: Received request", {
      body: req.body,
      user: req.user,
    });

    const { eventId } = req.body;
    const artistId = req.user.artistId; // This is the sender

    // === 1. Validate IDs ===
    console.log("Validating eventId:", { eventId });
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("Invalid eventId provided:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }
    
    // Also validate the artistId from the token
    if (!artistId || !mongoose.Types.ObjectId.isValid(artistId)) {
      console.warn("Invalid artistId in token:", { artistId });
      return apiResponse(res, {
        success: false,
        message: "Invalid artist credentials.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const artistObjectId = new mongoose.Types.ObjectId(artistId);
    console.log("Converted eventId to ObjectId:", { eventObjectId });

    // === 2. Fetch Event and Artist Details ===
    console.log("Checking if event exists:", { eventObjectId });
    const event = await Event.findById(eventObjectId);
    if (!event) {
      console.warn("Event not found:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      });
    }
    // We now have event.hostId (the recipient) and event.eventName
    console.log("Event found:", { eventId, eventName: event.eventName, hostId: event.hostId });

    // Fetch the artist profile to get their name for the notification
    console.log("Fetching applying artist profile:", { artistId });
    const artist = await ArtistProfile.findOne({ artistId: artistId });
    if (!artist) {
        console.warn("Artist profile not found:", { artistId });
        return apiResponse(res, {
            success: false,
            message: "Artist profile not found.",
            statusCode: 404,
        });
    }
    // We now have artist.profileName (assuming this field exists)
    console.log("Artist profile found:", { artistId, artistName: artist.profileName });


    // === 3. Check for Existing Application ===
    console.log("Checking for existing application:", { eventId, artistId });
    const existing = await EventApplication.findOne({ eventId, artistId });
    if (existing) {
      console.warn("Application already exists:", {
        eventId,
        artistId,
        existingApplication: existing,
      });
      return apiResponse(res, {
        success: false,
        message: "Application exists",
        statusCode: 400,
      });
    }
    console.log("No existing application found, proceeding to create new application");

    // === 3b. Max 3 applications per day: count applications on the same calendar day ===
    const eventFirstDate = event.eventDateTime && event.eventDateTime[0] ? new Date(event.eventDateTime[0]) : null;
    if (!eventFirstDate || isNaN(eventFirstDate.getTime())) {
      return apiResponse(res, {
        success: false,
        message: "Event has no valid date.",
        statusCode: 400,
      });
    }
    const targetDayStr = eventFirstDate.toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const targetDayStart = new Date(targetDayStr);
    targetDayStart.setUTCHours(0, 0, 0, 0);
    const targetDayEnd = new Date(targetDayStr);
    targetDayEnd.setUTCHours(23, 59, 59, 999);

    const sameDayCount = await EventApplication.aggregate([
      { $match: { artistId: artistObjectId, eventId: { $ne: eventObjectId } } },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "eventDoc",
        },
      },
      { $unwind: { path: "$eventDoc", preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          firstDate: { $arrayElemAt: ["$eventDoc.eventDateTime", 0] },
        },
      },
      {
        $match: {
          firstDate: { $gte: targetDayStart, $lte: targetDayEnd },
        },
      },
      { $count: "count" },
    ]);

    const count = sameDayCount[0]?.count ?? 0;
    if (count >= 3) {
      return apiResponse(res, {
        success: false,
        message: "You can apply to a maximum of 3 events per day.",
        statusCode: 400,
      });
    }

    // === 4. Create New Application ===
    console.log("Creating new EventApplication:", { artistId, eventId });
    const application = new EventApplication({ artistId, eventId });
    await application.save();
    console.log("EventApplication saved:", {
      applicationId: application._id,
      status: application.status,
      appliedAt: application.appliedAt,
    });

    // === 5. Create Notification for Host ===
    try {
      const hostNotificationData = {
        recipientId: event.hostId, // The host who owns the event
        recipientType: 'host',
        senderId: artistId, // The artist who applied
        senderType: 'artist',
        title: `New Application: ${event.eventName}`,
        body: `${artist.profileName || 'An artist'} has applied to your event: "${event.eventName}".`,
        type: 'event_application',
        data: {
          eventId: eventId,
          artistId: artistId,
          applicationId: application._id
        }
      };

      // Asynchronously create and send notification
      await NotificationService.createAndSendNotification(hostNotificationData);
      console.log(`[${new Date().toISOString()}] Notification created for host ${event.hostId} for application ${application._id}`);
    
    } catch (notificationError) {
      console.error(`[${new Date().toISOString()}] Error creating notification for event application:`, notificationError);
      // Do not fail the entire request if notification fails
    }

    // === 6. Populate and Send Response ===
    console.log("Populating eventId for application:", { applicationId: application._id });
    const populatedApplication = await EventApplication.findById(application._id).populate("eventId");
    console.log("Populated application:", {
      applicationId: application._id,
      eventDetails: populatedApplication.eventId,
    });

    return apiResponse(res, {
      success: true,
      message: "Application submitted successfully.",
      statusCode: 201,
      data: populatedApplication,
    });
  } catch (err) {
    console.error("ApplyForEvent error:", {
      error: err.message,
      stack: err.stack,
      eventId: req.body.eventId,
      artistId: req.user.artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};

exports.getAppliedEvents = async (req, res) => {
  const artistId = req.user.artistId;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = (req.query.search || "").trim();
  const status = req.query.status; // pending | accepted | rejected

  try {
    const query = { artistId };

    if (status && ["pending", "accepted", "rejected"].includes(status)) {
      query.status = status;
    }

    let eventIdFilter = null;
    if (search) {
      const events = await Event.find(
        { eventName: { $regex: search, $options: "i" } },
        { _id: 1 }
      )
        .lean()
        .exec();
      const eventIds = events.map((e) => e._id);
      if (eventIds.length === 0) {
        return apiResponse(res, {
          success: true,
          message: "Applied events fetched successfully",
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
          statusCode: 200,
        });
      }
      query.eventId = { $in: eventIds };
    }

    const [total, applications] = await Promise.all([
      EventApplication.countDocuments(query),
      EventApplication.find(query)
        .populate("eventId")
        .sort({ appliedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return apiResponse(res, {
      success: true,
      message: "Applied events fetched successfully",
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error("GetAppliedEvents error:", {
      error: error.message,
      artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch applied events",
      error: error.message,
      statusCode: 500,
    });
  }
};



exports.removeAppliedEvent = async (req, res) => {
  try {
    console.log("Starting removeAppliedEvent: Received request", {
      body: req.body,
      user: req.user,
    });

    const { eventId } = req.body;
    const artistId = req.user.artistId;

    // Validate eventId
    console.log("Validating eventId:", { eventId });
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      console.warn("Invalid eventId provided:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Invalid eventId.",
        statusCode: 400,
      });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    console.log("Converted eventId to ObjectId:", { eventObjectId });

    // Check if the event exists
    console.log("Checking if event exists:", { eventObjectId });
    const event = await Event.findById(eventObjectId);
    if (!event) {
      console.warn("Event not found:", { eventId });
      return apiResponse(res, {
        success: false,
        message: "Event not found.",
        statusCode: 404,
      });
    }
    console.log("Event found:", { eventId, eventName: event.eventName });

    // Check if the application exists
    console.log("Checking for existing application:", { eventId, artistId });
    const application = await EventApplication.findOne({ eventId, artistId });
    if (!application) {
      console.warn("Application not found:", { eventId, artistId });
      return apiResponse(res, {
        success: false,
        message: "Application not found.",
        statusCode: 404,
      });
    }
    console.log("Application found:", {
      applicationId: application._id,
      status: application.status,
    });

    // Remove the application
    console.log("Removing application:", { applicationId: application._id });
    await EventApplication.deleteOne({ _id: application._id });
    console.log("Application removed:", { applicationId: application._id });

    // Remove artistId from assignedArtists array in Event model
    console.log("Updating event's assignedArtists:", { eventId, artistId });
    const updatedEvent = await Event.findByIdAndUpdate(
      eventObjectId,
      { $pull: { assignedArtists: artistId } },
      { new: true }
    );
    console.log("Event updated:", {
      eventId,
      assignedArtists: updatedEvent.assignedArtists,
    });

    return apiResponse(res, {
      success: true,
      message: "Application removed successfully.",
      statusCode: 200,
    });
  } catch (err) {
    console.error("RemoveAppliedEvent error:", {
      error: err.message,
      stack: err.stack,
      eventId: req.params.eventId,
      artistId: req.user.artistId,
    });
    return apiResponse(res, {
      success: false,
      message: "Server error.",
      data: { error: err.message },
      statusCode: 500,
    });
  }
};