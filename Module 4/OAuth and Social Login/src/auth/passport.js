
async function verifyCallback(accessToken, refreshToken, profile, done) {
  try {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const emailVerified = profile._json?.email_verified;

    // 1. RETURNING OAuth user
    const existingGoogleUser = users.find(
      (user) => user.googleId === googleId
    );

    if (existingGoogleUser) {
      return done(null, existingGoogleUser);
    }

    // 2. EXISTING local account
    const existingLocalUser = users.find(
      (user) => user.email === email
    );

    if (existingLocalUser) {
      if (!emailVerified) {
        return done(null, false);
      }

      existingLocalUser.googleId = googleId;
      return done(null, existingLocalUser);
    }

    // 3. BRAND-NEW user
    const newUser = {
      id: nextId(),
      googleId,
      email,
      name,
      role: 'member',
    };

    users.push(newUser);

    return done(null, newUser);
  } catch (err) {
    return done(err);
  }
}
