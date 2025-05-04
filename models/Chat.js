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
    groupName: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Index for faster querying of user chats
chatSchema.index({ users: 1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
