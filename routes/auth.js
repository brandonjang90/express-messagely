const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
const db = require("../db");
const {BCRYPT_WORK_FACTOR, SECRET_KEY} = require("../config");
const jwt = require("jsonwebtoken");

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async (req, res, next) => {
    try { 
      const {username, password} = req.body;
      if(!username || !password) {
        throw new ExpressError ("Username and password required!", 404)
      }
      const results = await db.query(`
        SELECT username, password
        FROM users
        WHERE username = $1
      `, [username]);
  
      const user = results.rows[0];
      if(user){
       if (await bcrypt.compare(password, user.password)){
        const token = jwt.sign({username}, SECRET_KEY)
        return res.json({message: 'Logged in!', token})
        }
      }
      throw new ExpressError("Username or Password is incorrect", 400)
      return res.json(results.rows[0]);
    } catch (e) {
      return next (e)
    }
  })
  

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post('/register', async (req, res, next) => {
    try { 
      const {username, password} = req.body;
      if(!username || !password) {
        throw new ExpressError ("Username and password required!", 404)
      }
      // hash password
      const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      const results = await db.query(`
        INSERT INTO users (username, password)
        VALUES ($1, $2)
        RETURNING username
      `, [username, hashedPw])
      return res.json(results.rows[0]);
    } catch (e) {
      if(e.code === '23505'){
        return next (new ExpressError ("Username taken. Please choose another!", 400));
      }
      return next (e)
    }
  })
  
  module.exports = router;
  