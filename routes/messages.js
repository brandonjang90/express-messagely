const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");


/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const results = await db.query(`
        SELECT messages.id, messages.body, messages.sent_at, messages.read_at,
               from_user.username AS from_username, from_user.first_name AS from_first_name, 
               from_user.last_name AS from_last_name, from_user.phone AS from_phone,
               to_user.username AS to_username, to_user.first_name AS to_first_name, 
               to_user.last_name AS to_last_name, to_user.phone AS to_phone
        FROM messages
        JOIN users AS from_user ON messages.from_username = from_user.username
        JOIN users AS to_user ON messages.to_username = to_user.username
        WHERE messages.id = $1
      `, [id]);
  
      const message = results.rows[0];
      if (!message) {
        throw new ExpressError("Message not found", 404);
      }
  
      //Make sure that the currently-logged-in users is either the to or from user.
      if (req.user.username !== message.from_username && req.user.username !== message.to_username) {
        throw new ExpressError("Unauthorized access", 401);
      }
  
      return res.json({ message });
    } catch (e) {
      return next(e);
    }
  });

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', async (req, res, next) => {
    try {
      const { to_username, body } = req.body;
      const from_username = req.user.username;
      
      const results = await db.query(`
        INSERT INTO messages (from_username, to_username, body, sent_at)
        VALUES ($1, $2, $3, current_timestamp)
        RETURNING id, from_username, to_username, body, sent_at
      `, [from_username, to_username, body]);
  
      return res.json({ message: results.rows[0] });
    } catch (e) {
      return next(e);
    }
  });

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post('/:id/read', async (req, res, next) => {
    try {
      const { id } = req.params;
  
      // First, find the message to ensure the user is the intended recipient
      const result = await db.query(`
        SELECT to_username
        FROM messages
        WHERE id = $1
      `, [id]);
  
      const message = result.rows[0];
      if (!message) {
        throw new ExpressError("Message not found", 404);
      }
  
      // Ensure the current user is the recipient
      if (req.user.username !== message.to_username) {
        throw new ExpressError("Unauthorized access", 401);
      }
  
      // Mark message as read
      const updateResult = await db.query(`
        UPDATE messages
        SET read_at = current_timestamp
        WHERE id = $1
        RETURNING id, read_at
      `, [id]);
  
      return res.json({ message: updateResult.rows[0] });
    } catch (e) {
      return next(e);
    }
  });

module.exports = router;
