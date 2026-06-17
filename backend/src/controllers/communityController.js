const Community = require('../models/Community');
const User = require('../models/User');

/**
 * @desc    Get all active community trust circles
 * @route   GET /api/v1/communities
 * @access  Private
 */
const getCommunities = async (req, res, next) => {
  try {
    const communities = await Community.find({});
    return res.status(200).json({
      success: true,
      count: communities.length,
      data: communities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Join a community circle manually via optional passkey
 * @route   POST /api/v1/communities/join
 * @access  Private
 */
const joinCommunity = async (req, res, next) => {
  try {
    const { communityId, passkey } = req.body;

    const community = await Community.findById(communityId, '+passkey');
    if (!community) {
      res.status(404);
      throw new Error('Community circle not found');
    }

    const user = await User.findById(req.user._id);

    // If community has a passkey, validate it
    if (community.passkey && community.passkey !== passkey) {
      res.status(401);
      throw new Error('Invalid community joining passkey code');
    }

    if (user.communities.map(String).includes(String(community._id))) {
      res.status(400);
      throw new Error('You are already linked to this community circle');
    }

    // Link user to community and save
    user.communities.push(community._id);
    await user.save();

    community.memberCount += 1;
    await community.save();

    return res.status(200).json({
      success: true,
      message: `Successfully linked to community circle: ${community.name}`,
      communities: user.communities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCommunities,
  joinCommunity
};
