const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");

/** GET / - get list of users.
 *
 * => {users: [{username, first_name, last_name, phone}, ...]}
 *
 **/

router.get('/', async (req, res, next) => {
    try {
      const results = await db.query(`
        SELECT username, first_name, last_name, phone
        FROM users
      `);
      return res.json({ users: results.rows });
    } catch (e) {
      return next(e);
    }
  });

/** GET /:username - get detail of users.
 *
 * => {user: {username, first_name, last_name, phone, join_at, last_login_at}}
 *
 **/
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    const results = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1
    `, [username]);

    const user = results.rows[0];
    if (!user) {
      throw new ExpressError("User not found", 404);
    }

    return res.json({ user });
  } catch (e) {
    return next(e);
  }
});

/** GET /:username/to - get messages to user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 from_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
router.get('/:username/to', async (req, res, next) => {
    try {
      const { username } = req.params;
      const results = await db.query(`
        SELECT messages.id, messages.body, messages.sent_at, messages.read_at,
               from_user.username AS from_username, from_user.first_name AS from_first_name, 
               from_user.last_name AS from_last_name, from_user.phone AS from_phone
        FROM messages
        JOIN users AS from_user ON messages.from_username = from_user.username
        WHERE messages.to_username = $1
      `, [username]);
  
      return res.json({ messages: results.rows });
    } catch (e) {
      return next(e);
    }
  });

/** GET /:username/from - get messages from user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 to_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
router.get('/:username/from', async (req, res, next) => {
    try {
      const { username } = req.params;
      const results = await db.query(`
        SELECT messages.id, messages.body, messages.sent_at, messages.read_at,
               to_user.username AS to_username, to_user.first_name AS to_first_name, 
               to_user.last_name AS to_last_name, to_user.phone AS to_phone
        FROM messages
        JOIN users AS to_user ON messages.to_username = to_user.username
        WHERE messages.from_username = $1
      `, [username]);
  
      return res.json({ messages: results.rows });
    } catch (e) {
      return next(e);
    }
  });

module.exports = router;
