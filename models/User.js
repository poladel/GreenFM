const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

// Main user schema
const userSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Please enter an email'],
        validate: [isEmail, 'Please enter a valid email']
    },
    username: {
        type: String,
        required: [true, 'Please enter a username'],
        minlength: [5, 'Minimum of 5 Characters']
    },
    roles: {
        type: String,
        default: 'User'
    },
    department: {
        type: String,
        default: '' // Optional field
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [8, 'Minimum of 8 Characters']
    },
    lastName: {
        type: String,
        required: [true, 'Please enter your last name']
    },
    firstName: {
        type: String,
        required: [true, 'Please enter your first name']
    },
    middleInitial: {
        type: String,
        default: '' // Optional field
    },
    suffix: {
        type: String,
        default: '' // Optional field
    },
    dlsuD: {
        type: Boolean,
        required: [true, 'Please specify if you are from DLSU-D'],
        default: false,
        set: (value) => Boolean(value)
    },
    dlsudEmail: {
        type: String,
        default: '' // Optional field
    },
    studentNumber: {
        type: Number,
        default: '' // Optional field
    },
    refreshToken: {
        type: String, // Store the refresh token here
        default: null,
        unique: true
    },
    completedJoinGFMStep1: { type: Boolean, default: false }, // Track progress GFM
    completedJoinGFMStep2: { type: Boolean, default: false },
    completedBlocktimerStep1: { type: Boolean, default: false }, // Track progress Blocktimer
    completedBlocktimerStep2: { type: Boolean, default: false },
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpiry: {
        type: Date,
        default: null
    },
    chatLastViewed: {
        type: Map,
        of: Date,
        default: () => new Map() // Initialize with an empty Map
    }
});

// Function before doc saved to DB
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

// Static method to login user
userSchema.statics.login = async function(username, password) {
    const user = await this.findOne({ username });
    if (user) {
        const auth = await bcrypt.compare(password, user.password);
        if (auth) {
            return user; // Successful authentication
        }
        throw Error('Incorrect Password');
    }
    throw Error('Username does not exist');
};

const User = mongoose.model('User', userSchema);
module.exports = User;
