const express = require('express');
const router = express.flatten ? express.flatten() : express.Router(); // Mistake prevention if I hallucinate flatten, standard is Router()
// Actually, standard is:
// const express = require('express');
// const router = express.Router();

// Let's rewrite safely
const { registerUser, loginUser, faceLogin } = require('../controllers/authController');

const authRouter = express.Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/face-login', faceLogin);

module.exports = authRouter;
