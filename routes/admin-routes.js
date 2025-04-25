const express = require('express');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Chat = require('../models/Chat');
const router = express.Router();
const { renderAdminView } = require('../controllers/adminController');

// Define the routes for each 'user' section with dynamic titles
const adminRoute = [
    { path: '/Manage-Accounts', view: '1-admin/1-accounts', pageTitle: 'Manage Accounts', headerTitle: 'MANAGE ACCOUNTS', cssFile: 'css/admin-account.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Blocktimer', view: '1-admin/2-blocktimer', pageTitle: 'Blocktimer', headerTitle: 'BLOCKTIMER', cssFile: 'css/admin-blocktimer.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Staff', view: '1-admin/3-staff', pageTitle: 'Staff', headerTitle: 'STAFF', cssFile: 'css/admin-staff.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Chat', view: '1-admin/4-chat', pageTitle: 'Chat', headerTitle: 'CHAT', cssFile: 'css/chat.css', roles: ['Admin', 'Staff'], restricted: true },
];

// Define the routes and render views with dynamic titles
adminRoute.forEach(adminRoute => {
    router.get(adminRoute.path, requireAuth, checkRoles(adminRoute.roles), async (req, res, next) => {
        try {
            const user = res.locals.user;

            // Restriction check
            if (adminRoute.restricted && (!user || !adminRoute.roles.includes(user.roles))) {
                return res.render('restricted', {
                    message: 'Access Denied: Insufficient Permissions',
                    redirectUrl: '/'
                });
            }

            // Special case: load chat data for Chat page
            if (adminRoute.path === '/Chat') {
                // Fetch existing chats for the logged-in user
                const chats = await Chat.find({ users: user._id }).populate('users');
                
                // Find all Admin and Staff users except the current logged-in user
                const users = await User.find({
                    roles: { $in: ['Admin', 'Staff'] },
                    _id: { $ne: user._id }
                });

                // Now render the view and pass the 'users' and 'chats' data
                return res.render(adminRoute.view, {
                    pageTitle: adminRoute.pageTitle,
                    cssFile: adminRoute.cssFile,
                    user,
                    headerTitle: adminRoute.headerTitle,
                    currentPath: req.path,
                    chats, // pass the list of chats
                    users  // pass the list of users
                });
            }

            // Default rendering for other views
            return res.render(adminRoute.view, {
                pageTitle: adminRoute.pageTitle,
                cssFile: adminRoute.cssFile,
                user,
                headerTitle: adminRoute.headerTitle,
                currentPath: req.path
            });

        } catch (error) {
            console.error(`Error handling route ${adminRoute.path}:`, error);
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;