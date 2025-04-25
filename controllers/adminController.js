const Chat = require('../models/Chat');
const User = require('../models/User');

exports.renderAdminView = async (adminRoute, req, res) => {
    const user = res.locals.user;

    if (adminRoute.restricted) {
        if (!user || (adminRoute.roles && !adminRoute.roles.includes(user.roles))) {
            return res.render('restricted', {
                message: 'Access Denied: Insufficient Permissions',
                redirectUrl: '/'
            });
        }
    }

    if (adminRoute.path === '/Chat') {
        const chats = await Chat.find({ users: user._id }).populate('users');

        const users = await User.find({
            roles: { $in: ['Admin', 'Staff'] },
            _id: { $ne: user._id }
        });

        return res.render(adminRoute.view, {
            pageTitle: adminRoute.pageTitle,
            cssFile: adminRoute.cssFile,
            user,
            headerTitle: adminRoute.headerTitle,
            currentPath: req.path,
            chats,
            users
        });
    }

    return res.render(adminRoute.view, {
        pageTitle: adminRoute.pageTitle,
        cssFile: adminRoute.cssFile,
        user,
        headerTitle: adminRoute.headerTitle,
        currentPath: req.path
    });
};
