const express = require('express');
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const router = express.Router();  

// Define the routes for each 'user' section with dynamic titles
const adminRoute = [
    { path: '/ManageAccounts', view: '1-admin/1-accounts', pageTitle: 'Manage Accounts',  headerTitle: 'MANAGE ACCOUNTS', cssFile: 'css/admin-account.css', roles: ['Admin', 'Staff'] },
    { path: '/Blocktimer', view: '1-admin/2-blocktimer', pageTitle: 'Blocktimer',  headerTitle: 'BLOCKTIMER', cssFile: 'css/admin-blocktimer.css', roles: ['Admin', 'Staff'] },
    { path: '/Staff', view: '1-admin/3-staff', pageTitle: 'Staff',  headerTitle: 'STAFF', cssFile: 'css/admin-staff.css', roles: ['Admin', 'Staff'] },
];

// Define the routes and render views with dynamic titles
adminRoute.forEach(adminRoute => {
    router.get(adminRoute.path, requireAuth, checkRoles(adminRoute.roles), async (req, res, next) => {
        try {
            if (adminRoute.auth) {
                return requireAuth(req, res, async () => {
                    // Delegate to controller if specified
                    if (adminRoute.controller) {
                        return adminRoute.controller(req, res, next);
                    }

                    // Render the view if no controller is specified
                    return res.render(adminRoute.view, {
                        pageTitle: adminRoute.pageTitle,
                        cssFile: adminRoute.cssFile,
                        user: res.locals.user,
                        headerTitle: adminRoute.headerTitle,
                        redirectUrl: req.query.redirect || '/'
                    });
                });
            }

            // Render the view if no authentication is required
            if (!adminRoute.controller) {
                return res.render(adminRoute.view, {
                    pageTitle: adminRoute.pageTitle,
                    cssFile: adminRoute.cssFile,
                    user: res.locals.user,
                    headerTitle: adminRoute.headerTitle,
                    currentPath: req.path
                });
            }

            // Delegate to controller if specified
            if (adminRoute.controller) {
                return adminRoute.controller(req, res, next);
            }
        } catch (error) {
            console.error(`Error handling route ${adminRoute.path}:`, error);
            res.status(500).send('Server Error');
        }
    });
});

module.exports = router;
