const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Session configuration
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' }),
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Database initialization
const db = new sqlite3.Database('sih_database.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    pincode TEXT,
    govt_id_type TEXT,
    govt_id_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Issues table
  db.run(`CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    location TEXT,
    image_path TEXT,
    reporter_id INTEGER,
    votes INTEGER DEFAULT 0,
    assigned_officer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users (id)
  )`);

  // Votes table
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    issue_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, issue_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (issue_id) REFERENCES issues (id)
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    issue_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (issue_id) REFERENCES issues (id)
  )`);

  // Admins table
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default admin
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO admins (email, password, name) VALUES (?, ?, ?)`, 
    ['admin@sih.com', hashedPassword, 'Admin User']);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address, pincode, govtIdType, govtIdNumber } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO users (username, email, password, full_name, phone, address, pincode, govt_id_type, govt_id_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, fullName, phone, address, pincode, govtIdType, govtIdNumber],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign({ id: this.lastID, username, email }, JWT_SECRET);
        res.json({ 
          success: true, 
          token, 
          user: { id: this.lastID, username, email, fullName } 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET);
      res.json({ 
        success: true, 
        token, 
        user: { id: user.id, username: user.username, email: user.email, fullName: user.full_name } 
      });
    }
  );
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(
    'SELECT * FROM admins WHERE email = ?',
    [email],
    async (err, admin) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET);
      res.json({ 
        success: true, 
        token, 
        admin: { id: admin.id, email: admin.email, name: admin.name } 
      });
    }
  );
});

// Get all issues
app.get('/api/issues', (req, res) => {
  const { category, status, sortBy = 'created_at', order = 'DESC' } = req.query;
  
  let query = `
    SELECT i.*, u.username as reporter_name, 
           COUNT(v.id) as vote_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN votes v ON i.id = v.issue_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (category && category !== 'all') {
    conditions.push('i.category = ?');
    params.push(category);
  }
  
  if (status && status !== 'all') {
    conditions.push('i.status = ?');
    params.push(status);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ` GROUP BY i.id ORDER BY ${sortBy} ${order}`;
  
  db.all(query, params, (err, issues) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(issues);
  });
});

// Get single issue
app.get('/api/issues/:id', (req, res) => {
  const issueId = req.params.id;
  
  db.get(`
    SELECT i.*, u.username as reporter_name,
           COUNT(v.id) as vote_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN votes v ON i.id = v.issue_id
    WHERE i.id = ?
    GROUP BY i.id
  `, [issueId], (err, issue) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    
    res.json(issue);
  });
});

// Create new issue
app.post('/api/issues', authenticateToken, upload.single('image'), (req, res) => {
  const { title, description, category, location } = req.body;
  const imagePath = req.file ? req.file.path : null;
  
  console.log('Creating issue:', { title, description, category, location, imagePath, userId: req.user.id });
  
  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required' });
  }

  db.run(
    `INSERT INTO issues (title, description, category, location, image_path, reporter_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, category, location, imagePath, req.user.id],
    function(err) {
      if (err) {
        console.error('Database error creating issue:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      console.log('Issue created successfully with ID:', this.lastID);
      res.json({ 
        success: true, 
        issue: { 
          id: this.lastID, 
          title, 
          description, 
          category, 
          location, 
          image_path: imagePath,
          status: 'Pending',
          votes: 0
        } 
      });
    }
  );
});

// Vote on issue
app.post('/api/issues/:id/vote', authenticateToken, (req, res) => {
  const issueId = req.params.id;
  const userId = req.user.id;
  
  // Check if user already voted
  db.get(
    'SELECT id FROM votes WHERE user_id = ? AND issue_id = ?',
    [userId, issueId],
    (err, existingVote) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingVote) {
        return res.status(400).json({ error: 'You have already voted on this issue' });
      }
      
      // Add vote
      db.run(
        'INSERT INTO votes (user_id, issue_id) VALUES (?, ?)',
        [userId, issueId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Update vote count
          db.run(
            'UPDATE issues SET votes = votes + 1 WHERE id = ?',
            [issueId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ success: true, message: 'Vote added successfully' });
            }
          );
        }
      );
    }
  );
});

// Add comment to issue
app.post('/api/issues/:id/comments', authenticateToken, (req, res) => {
  const issueId = req.params.id;
  const { comment } = req.body;
  const userId = req.user.id;
  
  if (!comment) {
    return res.status(400).json({ error: 'Comment is required' });
  }
  
  db.run(
    'INSERT INTO comments (user_id, issue_id, comment) VALUES (?, ?, ?)',
    [userId, issueId, comment],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, message: 'Comment added successfully' });
    }
  );
});

// Get comments for issue
app.get('/api/issues/:id/comments', (req, res) => {
  const issueId = req.params.id;
  
  db.all(`
    SELECT c.*, u.username
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at ASC
  `, [issueId], (err, comments) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(comments);
  });
});

// Admin routes

// Get all issues for admin
app.get('/api/admin/issues', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { category, status, sortBy = 'votes', order = 'DESC' } = req.query;
  
  let query = `
    SELECT i.*, u.username as reporter_name, 
           COUNT(v.id) as vote_count
    FROM issues i
    LEFT JOIN users u ON i.reporter_id = u.id
    LEFT JOIN votes v ON i.id = v.issue_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (category && category !== 'all') {
    conditions.push('i.category = ?');
    params.push(category);
  }
  
  if (status && status !== 'all') {
    conditions.push('i.status = ?');
    params.push(status);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ` GROUP BY i.id ORDER BY ${sortBy} ${order}`;
  
  db.all(query, params, (err, issues) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(issues);
  });
});

// Update issue status
app.put('/api/admin/issues/:id/status', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const issueId = req.params.id;
  const { status, assignedOfficer } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  db.run(
    'UPDATE issues SET status = ?, assigned_officer = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, assignedOfficer, issueId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, message: 'Issue status updated successfully' });
    }
  );
});

// Get analytics data
app.get('/api/admin/analytics', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Get category-wise counts
  db.all(`
    SELECT category, COUNT(*) as count
    FROM issues
    GROUP BY category
  `, (err, categoryStats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get status-wise counts
    db.all(`
      SELECT status, COUNT(*) as count
      FROM issues
      GROUP BY status
    `, (err, statusStats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get total counts
      db.get(`
        SELECT 
          COUNT(*) as total_issues,
          COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved_issues,
          COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_issues,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_issues
        FROM issues
      `, (err, totalStats) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({
          categoryStats,
          statusStats,
          totalStats
        });
      });
    });
  });
});

// Serve API client file
app.get('/api-client.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-client.js'));
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
