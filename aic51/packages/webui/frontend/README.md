# AIC Video Search Frontend

A React-based web interface for video search and retrieval system, built for the AI Challenge (AIC) competition.

## Features

- **Video Frame Search**: Search through video frames using text queries
- **Similar Frame Search**: Find visually similar frames to a selected frame
- **Video Playback**: Play videos at specific timestamps
- **Advanced Filtering**: Configure search parameters including:
  - Number of probes (nprobe)
  - Result limit
  - Model selection
  - Temporal clustering (temporal_k)
  - OCR weight and threshold
  - Maximum interval settings
- **Answer Management**: Create, edit, and delete answers for competition submissions
- **Pagination**: Navigate through search results with keyboard shortcuts

## Tech Stack

- **Frontend**: React 18.3 with Vite
- **Routing**: React Router DOM 6.26
- **Styling**: Tailwind CSS 3.4
- **HTTP Client**: Axios 1.7
- **File Handling**: JSZip for downloads
- **Storage**: LocalForage for client-side persistence

## Getting Started

### Prerequisites

- Node.js (version compatible with React 18)
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Environment Variables

Set the backend port in your environment:

```bash
VITE_PORT=5000  # Default backend port
```

## Usage

### Search Interface

1. **Text Search**: Enter search queries in the main search bar
2. **Filter Configuration**: Adjust search parameters using the filter controls
3. **Pagination**: Use arrow keys (↑/↓) or navigation buttons to browse results
4. **Frame Selection**: Click on frames to select and search for similar content

### Keyboard Shortcuts

- `/` - Focus search bar
- `↑` - Previous page
- `↓` - Next page
- `Enter` - Submit search (in search bar)
- `Shift + Enter` - New line (in search bar)

### Answer Management

- Create answers for competition submissions
- Edit existing answers
- Delete unwanted answers
- Export answers in various formats

## API Integration

The frontend connects to a backend API running on `http://127.0.0.1:5000` with the following endpoints:

- `GET /api/search` - Text-based frame search
- `GET /api/similar` - Similar frame search
- `GET /api/frame_info` - Frame metadata
- `GET /api/models` - Available search models

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Answer.jsx      # Answer sidebar component
│   ├── Filter.jsx      # Search filter components
│   ├── Frame.jsx       # Frame display components
│   └── VideoPlayer.jsx # Video playback component
├── routes/             # Page components and loaders
│   ├── Root.jsx        # Main layout
│   ├── Search.jsx      # Search interface
│   ├── SearchSimilar.jsx # Similar search
│   └── answer*.jsx     # Answer management routes
├── services/           # API communication
│   ├── answer.js       # Answer API calls
│   └── search.js       # Search API calls
├── utils/              # Utility functions
└── assets/             # Static assets (icons, images)
```

## Development

### Code Style

- ESLint configuration for React best practices
- Prettier for code formatting (if configured)
- Follow React hooks and functional component patterns

### Adding New Features

1. Create components in the `components/` directory
2. Add new routes in `main.jsx` and corresponding files in `routes/`
3. Update API services in the `services/` directory
4. Add utility functions to the `utils/` directory

## Competition Context

This application is designed for the AI Challenge (AIC) video retrieval competition, enabling:

- Efficient searching through large video datasets
- Frame-level analysis and retrieval
- Competition answer submission and management
- Performance optimization for real-time search

## License

This project is part of the AIC competition submission.