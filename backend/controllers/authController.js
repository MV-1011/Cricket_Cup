import User from '../models/User.js';

// Login user
export const login = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'Please provide userId and password' });
    }

    // Find user by userId
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password (plain text comparison for simplicity)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user info (without password)
    res.json({
      _id: user._id,
      userId: user.userId,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Initialize default users (called once on startup)
export const initializeUsers = async () => {
  try {
    // Define the required users
    const requiredUsers = [
      {
        userId: 'Samp_Admin',
        password: 'MSM@2025!?',
        role: 'admin',
        name: 'Administrator'
      },
      {
        userId: 'Samp_Scorer1',
        password: 'PSM@1907?!',
        role: 'scorer',
        name: 'Scorer 1'
      },
      {
        userId: 'Samp_Scorer2',
        password: 'PSM@1907!?',
        role: 'scorer',
        name: 'Scorer 2'
      },
      {
        userId: 'Samp_Viewer',
        password: 'BAPS@NSDN!?%',
        role: 'viewer',
        name: 'Viewer'
      }
    ];

    // Update or create each user
    for (const userData of requiredUsers) {
      await User.findOneAndUpdate(
        { userId: userData.userId },
        userData,
        { upsert: true, new: true }
      );
    }

    // Remove any old default users that might exist
    await User.deleteMany({
      userId: { $in: ['admin', 'scorer', 'viewer'] }
    });

    console.log('Users initialized successfully');
  } catch (error) {
    console.error('Error initializing users:', error);
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user credentials
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, password, role, name } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userId) user.userId = userId;
    if (password) user.password = password;
    if (role) user.role = role;
    if (name) user.name = name;

    await user.save();

    res.json({
      _id: user._id,
      userId: user.userId,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
