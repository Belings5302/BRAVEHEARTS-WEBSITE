function adminAuthMiddleware(req, res, next) {
  const adminId = req.session?.adminId;
  const adminEmail = req.session?.adminEmail;
  const adminRole = req.session?.adminRole;

  if (!adminId || !adminEmail) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  req.admin = { id: adminId, email: adminEmail, role: adminRole };
  next();
}

module.exports = { adminAuthMiddleware };
