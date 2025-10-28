# Cricket Tournament Management System

A comprehensive web application for managing cricket tournaments, built with the MERN stack (MongoDB, Express.js, React, Node.js). This system allows you to manage teams, players, matches, live scoring, and track tournament statistics in real-time.

## Features

- **Dashboard**: Overview of tournament statistics and live matches
- **Live Score Input**: Easy-to-use interface for updating scores ball-by-ball
- **Real-time Updates**: Socket.io integration for instant score updates
- **Team Management**: Add, edit, and manage tournament teams
- **Player Management**: Track player details and statistics
- **Match Management**: Create and schedule matches
- **Standings Table**: View points table with team rankings
- **Top Performers**: Track top 20 batsmen and bowlers based on tournament performance
- **Detailed Scorecards**: View complete match scorecards with batting and bowling statistics

## Tournament Format

- 8-player teams
- 8 overs per innings
- 48 balls per innings (6 balls per over)
- Points system: 2 points for win, 1 point for tie/no result
- Net run rate calculation for tie-breaking

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io for real-time updates
- CORS enabled

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Socket.io-client for real-time updates
- Modern CSS with gradient backgrounds

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

### 1. Clone the repository
```bash
cd /home/mayur/PJs/Samp_Cup
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (already created, but verify settings)
# The .env file should contain:
# PORT=5022
# MONGODB_URI=mongodb+srv://posAdmin:Mbv%40pos1011@cluster0.golazke.mongodb.net/Samp_Cup
# NODE_ENV=development

# Start the backend server
npm run dev
```

The backend server will start on http://localhost:5022

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd /home/mayur/PJs/Samp_Cup/frontend

# Install dependencies (already installed, but if needed)
npm install

# Start the React development server
npm start
```

The frontend application will start on http://localhost:3003

## Usage Guide

### Initial Setup

1. **Start Backend**:
   ```bash
   cd backend && npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend && npm start
   ```

3. **Access Application**: Open http://localhost:3003 in your browser

### Creating Your First Tournament

1. **Add Teams**:
   - Go to "Teams" page
   - Click "Add Team"
   - Enter team name and 3-letter short name (e.g., "MUM" for Mumbai)
   - Click "Create Team"
   - Add all participating teams (minimum 2 teams required)

2. **Add Players**:
   - Go to "Players" page
   - Click "Add Player"
   - Enter player name, select team, role (Batsman/Bowler/All-rounder/Wicket-keeper)
   - Add jersey number
   - Click "Create Player"
   - Add 8 players for each team

3. **Schedule Matches**:
   - Go to "Matches" page
   - Click "Add Match"
   - Enter match number, select both teams, venue, and date
   - Set max overs (default is 8)
   - Click "Create Match"

4. **Start a Match**:
   - Go to "Matches" page
   - Click "Start" button for a scheduled match
   - Enter toss winner team ID and decision (bat/bowl)
   - Match will change to "LIVE" status

5. **Live Score Input**:
   - Once match is live, you'll see the score input interface
   - Select current batsman and bowler from dropdowns
   - Click runs scored (0, 1, 2, 3, 4, or 6)
   - Add extras if any (wide, no-ball, bye, leg-bye)
   - Check "Wicket" box if a wicket fell
   - If wicket, select wicket type and dismissed player
   - Click "Submit Ball"
   - The scorecard updates automatically

6. **View Statistics**:
   - **Dashboard**: See live matches and upcoming matches
   - **Standings**: View points table with team rankings
   - **Top Performers**: See top 20 batsmen and bowlers

## API Endpoints

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create new team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `GET /api/teams/standings` - Get standings table

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player
- `GET /api/players/top-batsmen?limit=20` - Get top batsmen
- `GET /api/players/top-bowlers?limit=20` - Get top bowlers

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches` - Create new match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match
- `POST /api/matches/:id/start` - Start match
- `POST /api/matches/:id/ball` - Update ball-by-ball score
- `GET /api/matches/live` - Get live matches

## Database Schema

### Team Schema
- name, shortName, logo
- players (array of player references)
- matchesPlayed, matchesWon, matchesLost, points, netRunRate

### Player Schema
- name, team (reference), role, jerseyNumber
- battingStats: innings, runs, ballsFaced, fours, sixes, highestScore, average, strikeRate
- bowlingStats: innings, overs, balls, runsConceded, wickets, economy, average, bestFigures

### Match Schema
- matchNumber, team1, team2, venue, date, status, maxOvers
- tossWinner, tossDecision, currentInnings
- innings (array): battingTeam, bowlingTeam, runs, wickets, overs, balls
- ballByBall (detailed ball-by-ball data)
- battingScorecard, bowlingScorecard
- winner, resultText

## Real-time Features

The application uses Socket.io for real-time updates:
- Live score updates broadcast to all connected clients
- Automatic scorecard refresh when balls are updated
- Live match status changes

## Troubleshooting

### MongoDB Connection Error
- Check MongoDB URI in backend/.env file
- Using MongoDB Atlas (cloud database)
- Verify your MongoDB Atlas credentials and connection string

### Port Already in Use
- Backend (5022): Kill process using `lsof -ti:5022 | xargs kill -9`
- Frontend (3003): Kill process using `lsof -ti:3003 | xargs kill -9`

### CORS Errors
- Ensure backend is running on port 5022
- Frontend should be on port 3003
- Check CORS configuration in backend/server.js

### Socket.io Connection Issues
- Verify both frontend and backend are running
- Check browser console for connection errors
- Ensure Socket.io URLs match (http://localhost:5022)

## Project Structure

```
Samp_Cup/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── teamController.js
│   │   ├── playerController.js
│   │   └── matchController.js
│   ├── models/
│   │   ├── Team.js
│   │   ├── Player.js
│   │   └── Match.js
│   ├── routes/
│   │   ├── teamRoutes.js
│   │   ├── playerRoutes.js
│   │   └── matchRoutes.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Teams.js
│   │   │   ├── Players.js
│   │   │   ├── Matches.js
│   │   │   ├── LiveScore.js
│   │   │   ├── Standings.js
│   │   │   └── TopPerformers.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
└── README.md
```

## Contributing

Feel free to submit issues and enhancement requests!

## Future Enhancements

- User authentication and authorization
- Match commentary feature
- Player photos and team logos
- Advanced statistics and charts
- Export data to PDF/Excel
- Mobile responsive improvements
- Video highlights integration
- Tournament bracket/fixture generation

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, please create an issue in the project repository.
