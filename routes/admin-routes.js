const express = require('express');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Chat = require('../models/Chat');
const router = express.Router();

// Define the routes for each 'user' section with dynamic titles
const adminRoute = [
    { path: '/Manage-Accounts', view: '1-admin/1-accounts', pageTitle: 'Manage Accounts', headerTitle: 'MANAGE ACCOUNTS', cssFile: 'css/admin-account.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Blocktimer', view: '1-admin/2-blocktimer', pageTitle: 'Blocktimer', headerTitle: 'BLOCKTIMER', cssFile: 'css/admin-blocktimer.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Staff', view: '1-admin/3-staff', pageTitle: 'Staff', headerTitle: 'STAFF', cssFile: 'css/admin-staff.css', roles: ['Admin', 'Staff'], restricted: true },
    { path: '/Chat', view: '1-admin/4-chat', pageTitle: 'Chat', headerTitle: 'CHAT', cssFile: 'css/chat.css', roles: ['Admin', 'Staff'], restricted: true },
];

// Define and handle the routes dynamically
adminRoute.forEach(adminRoute => {
    router.get(adminRoute.path, requireAuth, checkRoles(adminRoute.roles), async (req, res, next) => {
        try {
            const user = res.locals.user; // User object from middleware

            // Restriction check
            if (adminRoute.restricted && (!user || (adminRoute.roles && !adminRoute.roles.includes(user.roles)))) {
                return res.render('restricted', {
                    message: 'Access Denied: Insufficient Permissions',
                    redirectUrl: '/'
                });
            }

            // Special case: if Chat page, load additional data
            if (adminRoute.path === '/Chat') {
                // Fetch existing chats for the logged-in user
                const chats = await Chat.find({ users: user._id, archivedBy: { $ne: user._id } }).populate('users').sort({ updatedAt: -1 }); // Sort by recent activity, exclude archived

                // Fetch all Admin and Staff users except current user
                const users = await User.find({
                    roles: { $in: ['Admin', 'Staff'] },
                    _id: { $ne: user._id }
                });

                return res.render(adminRoute.view, {
                    pageTitle: adminRoute.pageTitle,
                    cssFile: adminRoute.cssFile,
                    user: user, // Already passing user
                    headerTitle: adminRoute.headerTitle,
                    currentPath: req.path,
                    chats,
                    users
                });
            }

            if (adminRoute.path === '/Staff') {
                const adminDepartment = user?.department; // Get department from user object (adjust 'department' if field name differs)
                console.log(`Rendering Staff page for user ${user?.email}, department: ${adminDepartment}`); // Debug log
                return res.render(adminRoute.view, {
                    pageTitle: adminRoute.pageTitle,
                    cssFile: adminRoute.cssFile,
                    user: user, // Already passing user
                    headerTitle: adminRoute.headerTitle,
                    currentPath: req.path,
                    adminDepartment: adminDepartment // Pass the department to the template
                });
            }

            // Render normally if no controller is specified
            return res.render(adminRoute.view, {
                pageTitle: adminRoute.pageTitle,
                cssFile: adminRoute.cssFile,
                user: user, // Already passing user
                headerTitle: adminRoute.headerTitle,
                currentPath: req.path
            });

        } catch (error) {
            console.error(`Error handling route ${adminRoute.path}:`, error);
             // Pass user to error page if possible
            res.status(500).render('error', { // Assuming you have an error.ejs view
                 message: 'Server Error',
                 error: process.env.NODE_ENV === 'development' ? error : {}, // Show details only in dev
                 user: res.locals.user // Pass user to error page too
            });
        }
    });
});

module.exports = router;
