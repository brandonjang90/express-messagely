/** User class for message.ly */

const ExpressError = require("../expressError");



/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}) { 
    try {
      const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
         RETURNING username, first_name, last_name, phone`,
        [username, hashedPw, first_name, last_name, phone]
      );

      return result.rows[0];
    } catch (e) {
      throw new ExpressError("Could not register user", 400);
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    try {
      const result = await db.query(
        `SELECT username, password 
        FROM users 
        WHERE username = $1`,
        [username]
      );

      const user = result.rows[0];

      if (user) {
        const isValid = await bcrypt.compare(password, user.password);
        return isValid;
      }

      return false;
    } catch (e) {
      throw new ExpressError("Could not authenticate user", 400);
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) { 
      try {
        await db.query(
          `UPDATE users S
          ET last_login_at = current_timestamp 
          WHERE username = $1`,
          [username]
        );
      } catch (e) {
        throw new ExpressError("Could not update login timestamp", 400);
      }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
      try {
        const result = await db.query(
          `SELECT username, first_name, last_name, phone 
          FROM users`
        );
        return result.rows;
      } catch (e) {
        throw new ExpressError("Could not fetch users", 404);
      }
   }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    try {
      const result = await db.query(
        `SELECT username, first_name, last_name, phone, join_at, last_login_at
         FROM users
         WHERE username = $1`,
        [username]
      );

      return result.rows[0]; // Return user data or undefined if not found
    } catch (e) {
      throw new ExpressError("Could not fetch user", 404);
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    try {
      const result = await db.query(
        `SELECT m.id, 
                m.body, 
                m.sent_at, 
                m.read_at, 
                u.username AS to_username, 
                u.first_name AS to_first_name, 
                u.last_name AS to_last_name, 
                u.phone AS to_phone
         FROM messages AS m
         JOIN users AS u ON m.to_username = u.username
         WHERE m.from_username = $1`,
        [username]
      );

      return result.rows.map((row) => ({
        id: row.id,
        body: row.body,
        sent_at: row.sent_at,
        read_at: row.read_at,
        to_user: {
          username: row.to_username,
          first_name: row.to_first_name,
          last_name: row.to_last_name,
          phone: row.to_phone,
        },
      }));
    } catch (e) {
      throw new ExpressError("Could not fetch messages from user", 404);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) { 
    try {
      const result = await db.query(
        `SELECT m.id, 
                m.body, 
                m.sent_at, 
                m.read_at, 
                u.username AS from_username, 
                u.first_name AS from_first_name, 
                u.last_name AS from_last_name, 
                u.phone AS from_phone
         FROM messages AS m
         JOIN users AS u ON m.from_username = u.username
         WHERE m.to_username = $1`,
        [username]
      );

      return result.rows.map((row) => ({
        id: row.id,
        body: row.body,
        sent_at: row.sent_at,
        read_at: row.read_at,
        from_user: {
          username: row.from_username,
          first_name: row.from_first_name,
          last_name: row.from_last_name,
          phone: row.from_phone,
        },
      }));
    } catch (e) {
      throw new ExpressError("Could not fetch messages to user", 404);
    }
  }
}


module.exports = User;