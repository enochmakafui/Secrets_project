//jshint esversion:6
import dotenv from 'dotenv';
dotenv.config();
import ejs from 'ejs';
import bodyParser from 'body-parser';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import findOrCreate from 'mongoose-findorcreate';

// import encrypt from "mongoose-encryption";
// import md5 from "md5";
// import bcrypt from 'bcrypt';

// const saltRounds = 10;

const app = express();
// const encrypt = require('mongoose-encryption');

const port = 3000;

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({
    secret:"This is our secret",
    resave:false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    facebookId:String,
    secret :String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID:process.env.FACEBOOK_APP_ID,
    clientSecret:process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email'],
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",(req,res) =>{
    res.render("home");
})

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });  
app.get("/register",(req,res) =>{

    res.render("register");
})
app.get("/login",(req,res) =>{
    res.render("login");
})

app.get("/secrets", (req,res) =>{
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }
    // else{
    //     res.redirect("/login")
    // }
    User.find({"secret": {$ne:null}})
    .then( foundUsers =>{
        if(foundUsers){
          res.render("secrets",{usersWithSecrets:foundUsers})
        }
    })
    .catch(err =>{
      console.log(err)
    })


});
app.get("/submit",(req,res) =>{
  if(req.isAuthenticated()){
    res.render("submit");
}
else{
    res.redirect("/login")
}
})
// app.get("/logout",(req,res) =>{
//     req.logOut();
//     res.redirect("/");
// })
app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

app.post("/register",(req,res)=>{
//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         // Store hash in your password DB.
//         const userEmail = req.body.username;
//         const userPassword =hash;
//         const user = new User({
//         email:userEmail,
//         password:userPassword
//     })
//     user.save()
//     res.render("secrets")

// })
    User.register({username:req.body.username},req.body.password, function(err, user) {
        if(err){
            console.log(err);
            res.redirect("/login");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })

        }
      
    
    });
    });
    

app.post("/login",(req,res) =>{
    // User.findOne({email:req.body.username})
    // .then( (foundResult)=>{
    
    //     bcrypt.compare(req.body.password,foundResult.password , function(err, result) {
    //         // result == true
    //         // console.log(hash);
    //         if(result){
    //             res.render("secrets");
    //             // console.log(req.body.password);
    //             // console.log(foundResult.password);
        
               
    //         }
    //     });
    // })
    // .catch(err =>{
    //     console.log(err);
    // })
    const user = new User({
        username:req.body.username,
        password:req.body.password,
        
    })
    req.logIn(user, function(err){
        if(err){
            console.log(err)
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
        }
    })
})
app.post("/submit",(req,res)=>{
  const submittedSecret = req.body.secret;
  // console.log(req.user);
  User.findById(req.user._id)
  .then(foundUser =>{
    console.log(foundUser);
    foundUser.secret = submittedSecret;
    foundUser.save()
    .then( ()=>{
      res.redirect("/secrets");
    })
    .catch(err =>{
      console.log(err);
    })
  })
  .catch(err =>{
    console.log(err)
  })
    
});


app.listen(port,(req,res)=>{
    console.log(`Server started on port ${port}`);
})












