import express from 'express';
import { Request, Response } from 'express';
import { MyType } from './types/index'; // Importing types for type safety

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());

// Example route
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to My Project!');
});

// Additional routes can be defined here
// app.use('/api', apiRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});