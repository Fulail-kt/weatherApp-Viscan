const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const router = express.Router();

// Middleware to authenticate JWT token

// written here because of less lines of code
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); 

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); 
    req.user = user;
    next();
  });
};



// Register route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        const exist=await prisma.user.findUnique({where:{email}})
        if(exist){
            return res.status(409).json({message:"User already exists",success:false})
        }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword, 
        },
      });
      res.status(201).json({ message: 'User registered successfully',success:true });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Failed to register user' ,success:false});
    }
  });
  

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(user,"user")
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password',success:false });
    }

    const accessToken = jwt.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.json({ accessToken ,message:"successfully logged in",success:true});
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Failed to log in',success:false });
  }
});

// Add favorite city
router.post('/favorite', authenticateToken, async (req, res) => {
  const { city } = req.body;
  const userId = req.user.id;
  
  try {
    const existingFavorite = await prisma.favorite.findFirst({
        where: {
          city: city.toLowerCase(), 
          userId,
        },
      });
  
      if (existingFavorite) {
        return res.status(400).json({ message: 'City is already a favorite' });
      }
    const favorite = await prisma.favorite.create({
      data: {
        city,
        userId,
      },
    });
    res.status(201).json({ message: 'Favorite city added successfully' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

// Get all favorite cities for a user
router.get('/favorites/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
    });
    res.json({favorites,message:'successfully retried favorites',success:true});
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

module.exports = router;
