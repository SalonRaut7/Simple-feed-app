const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const post = require('./models/post');
const upload = require('./config/multerconfig');
const path = require('path');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render('index');
})

app.get('/profile/upload', (req, res) => {
    res.render('profileupload');
})

app.post('/upload', isLoggedIn ,upload.single('image') ,async (req, res) => {
    let user = await userModel.findOne({email:req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/logout', (req, res) => {
    res.cookie('token','');
    res.redirect('/login');
})

app.get('/profile', isLoggedIn ,async (req,res)=>{
    let user = await userModel.findOne({ email: req.user.email}).populate('posts');//whatever the postid user has, it will populate it into content
    res.render('profile', {user});
})

app.get('/like/:id', isLoggedIn ,async (req,res)=>{
    let post = await postModel.findOne({ _id: req.params.id}).populate('user');
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn ,async (req,res)=>{
    let post = await postModel.findOne({ _id: req.params.id}).populate('user');
    res.render('edit', {post});
});

app.post('/update/:id', isLoggedIn ,async (req,res)=>{
    let post = await postModel.findOneAndUpdate({ _id: req.params.id},{content: req.body.content});
    res.redirect('/profile');
});

app.post('/post', isLoggedIn ,async (req,res)=>{
    let user = await userModel.findOne({ email: req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});

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
            res.status(200).redirect('/profile');
        } 
        else res.redirect('/login');
    })
    
})

//middleware for protected routes.
function isLoggedIn(req,res,next){
    if(req.cookies.token === '') res.redirect('/login');
    else{
        let data = jwt.verify(req.cookies.token, 'secret');
        req.user = data;
        next();
    }
}



app.listen(3000);