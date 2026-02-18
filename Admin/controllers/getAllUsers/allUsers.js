const Host = require("../../../Host/models/Auth/Auth");
const Artist = require("../../../Artist/models/Auth/Auth");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");


exports.getAllAppUsers = async (req, res) => {
    try {
        // Fetch hosts and artists only
        const [hosts, artists] = await Promise.all([
            Host.find().lean().select("fullName email role mobileNumber location"),
            Artist.find().lean().select("fullName email role mobileNumber _id"),
        ]);

        // Fetch artist locations from ArtistProfile
        const artistIds = artists.map(a => a._id);
        const artistProfiles = await ArtistProfile.find({ artistId: { $in: artistIds } }).lean().select("artistId location");
        const artistLocationMap = {};
        artistProfiles.forEach(profile => {
            artistLocationMap[profile.artistId.toString()] = profile.location;
        });

        // Merge location into artists
        const allUsers = [
            ...hosts.map(h => ({ ...h })),
            ...artists.map(a => ({
                ...a,
                location: artistLocationMap[a._id.toString()] || null,
            })),
        ];

        return apiResponse(res, {
            success: true,
            message: "All app users (hosts and artists) fetched successfully",
            data: {
                total: allUsers.length,
                users: allUsers,
            },
        });

    } catch (error) {
        console.error("Error fetching all users:", error);
        return apiResponse(res, {
            success: false,
            message: "Failed to fetch all users",
            data: { error: error.message },
            statusCode: 500,
        })
    }
}
