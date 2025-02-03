const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/logout', (req, res) => {
    res.cookie('token','');
    res.redirect('/login');
})

app.get('/profile', isLoggedIn ,(req,res)=>{
    console.log(req.user);
    res.redirect('/login');
})

app.post('/register', async (req, res) => {
    let { name, age, email, password, username } = req.body;
    //checking if user already exists
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send('User already registered.');
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            })

            let token = jwt.sign({email: email, userid: user._id}, 'secret');
            res.cookie('token', token);
            res.send('User Registered Successfully')
        })
    })
})

app.post('/login', async (req, res) => {
    let {email, password} = req.body;
    //checking if user donot exist
    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send('User not registered.');

    bcrypt.compare(password, user.password,(err,result)=>{
        if(result) {
            let token = jwt.sign({email: email, userid: user._id}, 'secret');
            res.cookie('token', token);
            res.status(200).send('You can login');
        } 
        else res.redirect('/login');
    })
    
})

//middleware for protected routes.
function isLoggedIn(req,res,next){
    if(req.cookies.token === '') res.send("you must be logged in");
    else{
        let data = jwt.verify(req.cookies.token, 'secret');
        req.user = data;
        next();
    }
}



app.listen(3000);