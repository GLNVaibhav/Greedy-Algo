const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const allocateRouter = require('./routes/allocate');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend from public/ (legacy)
app.use('/', express.static(config.staticDir));

// API routes
app.use('/api/allocate', allocateRouter);

const PORT = config.port;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
