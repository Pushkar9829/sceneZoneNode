const Event = require("../../../Host/models/Events/event");
const EventApplication = require("../../models/EventApplication/eventApplication");
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require("mongoose");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

exports.getAllEventsForArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    const page = Math.max(1, parseInt(req.query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const rejectedApplications = await EventApplication.find({
      artistId,
      status: "rejected",
    }).select("eventId");

    const rejectedEventIds = rejectedApplications.map((app) =>
      app.eventId.toString()
    );

    const baseQuery = {
      _id: { $nin: rejectedEventIds },
    };

    const [total, events] = await Promise.all([
      Event.countDocuments(baseQuery),
      Event.find(baseQuery)
        .populate("assignedArtists")
        .sort({ eventDateTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return apiResponse(res, {
      success: true,
      message: "Events fetched successfully for artist (excluding rejected applications)",
      data: events,
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
    console.error("Get all events for artist error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch events",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Get all events where the artist is booked (assigned)
exports.getBookedEventsForArtist = async (req, res) => {
  try {
    const artistId = req.user.artistId;
    // Find all events where artistId is in assignedArtists
    const events = await Event.find({
      assignedArtists: artistId
    }).sort({ eventDateTime: 1 });
    return apiResponse(res, {
      success: true,
      message: "Booked events fetched successfully for artist",
      data: events,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Get booked events for artist error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch booked events",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};