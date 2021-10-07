"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to use when they must be admins.
 *
 * If not, raises Unauthorized.
 */
function ensureAdmin(req, res, next) {
  try {
    if (!res.locals.user.isAdmin === true) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}


/** Middleware to use when they must be admins or the same user as the appears in the parameter.
 * 
 * If not, raises Unauthorized.
 * If req.body contains password, unauthorize for admins.
 */
function ensureUserOrAdmin(req, res, next) {
  try {
    if (req.body.password) {
      // console.log("there is password in req.body")
      // console.log("res.locals.user.username", res.locals.user.username)
      // console.log("req.params.username", req.params.username)

      if (!(res.locals.user.username === req.params.username)) {
        // console.log('hit unequal situation')
        throw new UnauthorizedError();
      }
      return next();
    }
    else {
      if (!(res.locals.user.username === req.params.username || res.locals.user.isAdmin === true)) {
        throw new UnauthorizedError();
      }
      return next();
    }
  } catch (err) {
    return next(err);
  }
}



module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureUserOrAdmin
};
