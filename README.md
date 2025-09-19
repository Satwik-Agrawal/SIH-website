# Societal Issue Reporting System

A comprehensive web application for reporting and managing societal issues in communities. Built with Node.js, Express, SQLite, and modern web technologies.

## Features

### 🔑 Authentication System
- User registration and login
- Secure password hashing with bcrypt
- JWT-based session management
- Admin authentication system

### 🏠 User Features
- **Home Page**: Browse and search issues with real-time filtering
- **Issue Reporting**: Camera integration and AI-powered category detection
- **Voting System**: One vote per user per issue
- **Comments**: Add comments to issues
- **Profile Management**: View reported issues and profile information
- **Map View**: Interactive map showing issue locations
- **Help & Support**: FAQ and AI chatbot assistance

### 👨‍💼 Admin Features
- **Dashboard**: Analytics and statistics
- **Issue Management**: Update status and assign officers
- **Filtering & Sorting**: Advanced issue filtering options
- **Charts & Analytics**: Visual data representation
- **Map View**: Geographic issue distribution

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: JWT, bcrypt
- **File Upload**: Multer
- **Maps**: Leaflet.js
- **Charts**: Chart.js
- **AI**: Mock image classification service

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd sih_website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - The application will be running on port 3000

### Default Admin Account
- **Email**: admin@sih.com
- **Password**: admin123

## Project Structure

```
sih_website/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── ai-classifier.js       # AI image classification service
├── api-client.js          # Frontend API client
├── index.html             # Home page
├── login.html             # User login page
├── signup.html            # User registration page
├── report.html            # Issue reporting page
├── profile.html           # User profile page
├── help.html              # Help & support page
├── admin_dashboard.html   # Admin dashboard
├── admin/
│   ├── admin_login.html   # Admin login page
│   └── admin_signup.html  # Admin registration page
├── uploads/               # File upload directory
├── sih_database.db        # SQLite database (created automatically)
├── sessions.db            # Session storage (created automatically)
└── static files...        # CSS, images, etc.
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/admin/login` - Admin login

### Issues
- `GET /api/issues` - Get all issues
- `GET /api/issues/:id` - Get single issue
- `POST /api/issues` - Create new issue
- `POST /api/issues/:id/vote` - Vote on issue
- `POST /api/issues/:id/comments` - Add comment
- `GET /api/issues/:id/comments` - Get comments

### Admin
- `GET /api/admin/issues` - Get all issues for admin
- `PUT /api/admin/issues/:id/status` - Update issue status
- `GET /api/admin/analytics` - Get analytics data

## Usage Guide

### For Users

1. **Registration/Login**
   - Visit the home page
   - Click "Sign Up" to create an account
   - Or click "Login" if you already have an account

2. **Reporting Issues**
   - Click "Report Now" button
   - Fill in issue details
   - Take a photo or upload an image
   - AI will suggest a category
   - Submit the report

3. **Voting and Comments**
   - Browse issues on the home page
   - Click "Vote" to support an issue
   - Click "Comment" to add your thoughts
   - Click on issue cards to see detailed view

4. **Profile Management**
   - Click on your name in the header
   - View your reported issues
   - Track issue status

### For Admins

1. **Admin Login**
   - Go to `/admin/admin_login.html`
   - Use admin credentials to login

2. **Dashboard**
   - View statistics and analytics
   - Monitor issue trends
   - Check resolution rates

3. **Issue Management**
   - Filter and sort issues
   - Update issue status
   - Assign officers
   - View detailed issue information

## Features in Detail

### AI Image Classification
- Mock implementation that suggests categories based on image analysis
- In production, integrate with real ML models like TensorFlow.js
- Currently provides random category suggestions with confidence scores

### Camera Integration
- Direct camera access for mobile and desktop
- Image capture and preview
- File upload fallback

### Real-time Updates
- Issues update in real-time across all views
- Vote counts update immediately
- Status changes reflect instantly

### Responsive Design
- Mobile-first approach
- Works on all device sizes
- Touch-friendly interface

## Database Schema

### Users Table
- id, username, email, password, full_name, phone, address, pincode, govt_id_type, govt_id_number, created_at

### Issues Table
- id, title, description, category, status, location, image_path, reporter_id, votes, assigned_officer, created_at, updated_at

### Votes Table
- id, user_id, issue_id, created_at

### Comments Table
- id, user_id, issue_id, comment, created_at

### Admins Table
- id, email, password, name, created_at

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- File upload restrictions

## Development Notes

### Adding New Features
1. Update the database schema in `server.js`
2. Add new API endpoints
3. Update the frontend API client
4. Modify the UI components

### Customizing AI Classification
1. Replace the mock implementation in `ai-classifier.js`
2. Integrate with real ML models
3. Update the confidence scoring system

### Styling
- All styles are in individual HTML files
- Uses modern CSS Grid and Flexbox
- Responsive design principles
- Consistent color scheme and typography

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `server.js`
   - Or kill the process using the port

2. **Database errors**
   - Delete `sih_database.db` and restart
   - Check file permissions

3. **File upload issues**
   - Ensure `uploads/` directory exists
   - Check file permissions

4. **Authentication issues**
   - Clear browser localStorage
   - Check JWT secret configuration

### Logs
- Server logs are displayed in the console
- Check browser console for frontend errors
- Database queries are logged for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@sih-issues.com
- Phone: +91 98765 43210
- Use the in-app chatbot for instant help

---

**Built for SIH25031 - Smart India Hackathon 2025**
