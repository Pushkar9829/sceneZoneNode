const { apiResponse } = require("../../../utils/apiResponse");
const Event = require("../../../Host/models/Events/event");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const getFilteredEvents = async (req, res) => {
  try {
    const { genre, budget, location, keywords, page: pageParam, limit: limitParam } = req.body || {};
    const page = Math.max(1, parseInt(pageParam, 10) || DEFAULT_PAGE);
    const limit = Math.min(50, Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const orQueries = [];

    if (genre && Array.isArray(genre) && genre.length > 0) {
      orQueries.push({ genre: { $in: genre } });
    }

    if (budget && Array.isArray(budget) && budget.length > 0) {
      const budgetConditions = budget.map(b => {
        if (typeof b === "object" && b.min !== undefined && b.max !== undefined) {
          return { budget: { $gte: b.min, $lte: b.max } };
        }
        return { budget: b };
      });
      orQueries.push({ $or: budgetConditions });
    }

    if (location && Array.isArray(location) && location.length > 0) {
      const locationConditions = location.map(loc => ({
        $or: [
          { venue: { $regex: loc, $options: "i" } },
          { location: { $regex: loc, $options: "i" } }
        ]
      }));
      orQueries.push(...locationConditions);
    }

    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const keywordConditions = keywords.map(keyword => ({
        $or: [
          { eventName: { $regex: keyword, $options: "i" } },
          { about: { $regex: keyword, $options: "i" } },
          { venue: { $regex: keyword, $options: "i" } },
          { location: { $regex: keyword, $options: "i" } },
          { genre: { $regex: keyword, $options: "i" } }
        ]
      }));
      orQueries.push(...keywordConditions);
    }

    const query = orQueries.length > 0 ? { $or: orQueries } : {};
    const finalQuery = {
      ...query,
      isCompleted: false,
      isCancelled: false,
      status: { $ne: 'rejected' }
    };

    const [total, events] = await Promise.all([
      Event.countDocuments(finalQuery),
      Event.find(finalQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return apiResponse(res, {
      success: true,
      message: "Filtered events fetched successfully",
      data: events,
      pagination: { page, limit, total, totalPages, hasMore },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error in getFilteredEvents:', error);
    return apiResponse(res, {
      success: false,
      message: "Server error",
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

module.exports = { getFilteredEvents };