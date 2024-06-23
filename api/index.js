const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const fs = require('fs').promises; // Using fs.promises for async file operations

dotenv.config();
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));

// Middleware function to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json('No token');
  }
  jwt.verify(token, jwtSecret, {}, (err, userData) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json('Invalid token');
    }
    req.userData = userData; // Attach user data to the request object
    next(); // Proceed to the next middleware
  });
};

// Route to test server status
app.get('/test', (req, res) => {
  res.json('Server test OK');
});

// Route to fetch messages between users
app.get('/messages/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.userData;
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'An error occurred while fetching messages.' });
  }
});

// Route to fetch users
app.get('/people', async (req, res) => {
  console.log('Request received:', req.method, req.url);
  try {
    const users = await User.find({}, { '_id': 1, username: 1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'An error occurred while fetching users.' });
  }
});

// Route to handle user profile retrieval
app.get('/profile', verifyToken, (req, res) => {
  res.json(req.userData); // Access user data from request object
});

// Route to handle user login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      return res.status(400).json({ error_message: 'User Not Found, Please Register below.' });
    }
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (!passOk) {
      return res.status(400).json({ error_message: 'Invalid Password' });
    }
    const token = jwt.sign({ userId: foundUser._id, username }, jwtSecret, {});
    res.cookie('token', token, { sameSite: 'none', secure: true }).json({
      id: foundUser._id,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// Route to handle user logout
app.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true }).json('ok');
});

// Route to handle user registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });
    const token = jwt.sign({ userId: createdUser._id, username }, jwtSecret, {});
    res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
      id: createdUser._id,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// Start the server and WebSocket server
const server = app.listen(4040, () => {
  console.log("Server started at port 4040");
});

const wss = new ws.WebSocketServer({ server });

// WebSocket server logic
wss.on('connection', (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
      }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('WebSocket connection terminated due to inactivity');
    }, 1000);
  }, 5000);

  // Read username and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) {
            console.error('WebSocket JWT verification error:', err);
            connection.close(); // Close WebSocket connection on JWT verification error
            return;
          }
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  // Handle incoming messages from WebSocket clients
  connection.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.toString());
      const { recipient, text, file } = messageData;
      let filename = null;
      if (file) {
        const parts = file.name.split('.');
        const ext = parts[parts.length - 1];
        filename = `${Date.now()}.${ext}`;
        const path = __dirname + '/uploads/' + filename;
        const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
        await fs.writeFile(path, bufferData);
        console.log('File saved:', path);
      }
      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? filename : null,
        });
        console.log('Message created:', messageDoc);
        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            file: file ? filename : null,
            _id: messageDoc._id,
          })));
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      // Handle error as needed
    }
  });

  // Notify all clients about online users when a new connection is established
  notifyAboutOnlinePeople();
});
