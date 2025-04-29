const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new Schema({
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [messageSchema],
    isGroupChat: { type: Boolean, default: false },
    groupName: { type: String, default: '' }
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
