const Host = require("../../../Host/models/Auth/Auth");
const HostProfile = require("../../../Host/models/Profile/profile");
const Artist = require("../../../Artist/models/Auth/Auth");
const ArtistProfile = require("../../../Artist/models/Profile/profile");
const { apiResponse } = require("../../../utils/apiResponse");


exports.getAllAppUsers = async (req, res) => {
    try {
        // Fetch hosts (Auth only - no email/location on Auth)
        const hostsAuth = await Host.find().lean().select("fullName role mobileNumber _id");
        const hostIds = hostsAuth.map(h => h._id);
        const hostProfiles = await HostProfile.find({ hostId: { $in: hostIds } }).lean().select("hostId email location");
        const hostProfileMap = {};
        hostProfiles.forEach(p => {
            hostProfileMap[p.hostId.toString()] = { email: p.email || null, location: p.location || null };
        });

        // Fetch artists (Auth has no email; ArtistProfile has email, address)
        const artistsAuth = await Artist.find().lean().select("fullName role mobileNumber _id");
        const artistIds = artistsAuth.map(a => a._id);
        const artistProfiles = await ArtistProfile.find({ artistId: { $in: artistIds } }).lean().select("artistId email address");
        const artistProfileMap = {};
        artistProfiles.forEach(p => {
            artistProfileMap[p.artistId.toString()] = { email: p.email || null, location: p.address || null };
        });

        const allUsers = [
            ...hostsAuth.map(h => ({
                ...h,
                email: hostProfileMap[h._id.toString()]?.email ?? null,
                location: hostProfileMap[h._id.toString()]?.location ?? null,
            })),
            ...artistsAuth.map(a => ({
                ...a,
                email: artistProfileMap[a._id.toString()]?.email ?? null,
                location: artistProfileMap[a._id.toString()]?.location ?? null,
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
