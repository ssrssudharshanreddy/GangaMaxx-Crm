import { auth, db } from '../config/firebase.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    // Load additional user profile details from Firestore
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Access Denied: User profile does not exist' });
    }

    const userData = userDoc.data();
    const normalizedStatus = String(userData.status || '').trim();
    if (normalizedStatus !== 'active' && normalizedStatus !== 'Activated') {
      return res.status(403).json({ error: `Access Denied: Account status is ${userData.status}` });
    }

    req.user.role = userData.role || 'Customer';
    req.user.name = userData.name || userData.email.split('@')[0];
    req.user.institutionId = userData.institutionId || null;
    req.user.permissions = userData.permissions || [];

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token session' });
  }
};

export const authorize = (allowedRoles = [], requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Role check
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Role ${req.user.role} is not permitted` });
    }

    // Permissions check
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((p) => req.user.permissions.includes(p));
      if (!hasAllPermissions) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
    }

    next();
  };
};

export const checkOwnership = (req, res, next) => {
  // Enforces that customers can only query/write documents belonging to their institution
  if (req.user.role === 'Customer' && !req.user.institutionId) {
    return res.status(403).json({ error: 'Forbidden: Missing institution ID scope' });
  }
  next();
};
