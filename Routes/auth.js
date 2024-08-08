import express from "express"
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import Cryptr from "cryptr";
import passport from "passport";
import { validationResult } from "express-validator";
import multer from "multer";

import conn from "../dbmodel.js";
import fss from "../config/filestore.js";
import mailer from "../config/mailer.js";
import validator from "../config/validator.js";
import jwtinit from "../config/jwtAuth.js";
import localinit from "../config/localAuth.js";
// import init from "../config/googleAuth.js";

const encoder = new Cryptr(process.env.JWT_SECRET);
const dstorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve() + '/userstorage/photos')
    },
    filename: (req, file, cb) => {
        let uname = req.body.uname;
        const name = uname + "-" + Date.now();
        cb(null, name);
    }
});
const mstorage = multer.memoryStorage()
const updfile = multer({ storage: dstorage });
const cachefile = multer({ storage: mstorage });

const route = express.Router();
dotenv.config()

let Users, UserReqs;

if (conn) {
    Users = await conn.db("sock8").collection("users");
    UserReqs = await conn.db("sock8").collection("userrequests");
}
conn.on('topologyOpening', async (e) => {
    console.log(123);
    Users = await conn.db("sock8").collection("users");
    UserReqs = await conn.db("sock8").collection("userrequests");
})

jwtinit(Users)
localinit(Users)

route.use(passport.initialize())
route.use(passport.session());
route.use(cors({
    origin: "https://sock8-b2a8f.web.app",
    credentials: true
}))
route.get("/temp", (req, res, next) => {
    if (req.isAuthenticated()) {
        res.status(400).json({ user:{}, msg: 'failure' });
    }
    else if(req.query.token){
        let tokenuser = encoder.decrypt(req.query.token);
        let user = JSON.parse(tokenuser);
        res.status(200).json({...user,msg:'success'})
    }
    else {
        res.status(400).json({user: {}, msg: 'failure' });
    }
})
route.get("/", (req, res, next) => {
    console.log(req.session);
    console.log(req.user);
    if(req.query.token){
        let tokenuser = encoder.decrypt(req.query.token);
        let user = JSON.parse(tokenuser);
        res.status(200).set({ 'Content-Type': 'application/json' }).send({...user,msg:'success'})
    }
    else if (req.isAuthenticated()) {
        res.status(200).set({ 'Content-Type': 'application/json' }).send({ ...req.user, msg: 'success' });
    }
    else {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({ ...req.user, msg: 'failure' });
    }
    next();
})

route.get("/verify", validator.validator, async (req, res) => {
    if (req.isAuthenticated()) {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({
            "msg": "you are already logged in"
        });
    } else {
        try {
            if (req.query.key) {
                let user = await UserReqs.findOne({ otp: req.query.key });
                if (!user) {
                    res.status(400).set({ 'Content-Type': 'application/json' }).send({
                        "msg": "sorry,verification code expired"
                    });
                    return;
                }
                delete user['otp']; delete user['id']; delete user['created'];
                user.history = { tictactoe: [] };
                await Users.insertOne(user);
                await UserReqs.deleteOne({ id: user.id });
                let tok = encoder.encrypt(JSON.stringify({uname:user['uname'],mail:user['mail'],upic:user['ppic']}));
                console.log(JSON.stringify({uname:user['uname'],mail:user['mail'],upic:user['ppic']}));
                res.redirect(`http://${process.env.APP_URL}/?token=${tok}&login=true`);
            }
            else {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "missing key"
                });
            }
        }
        catch (e) {
            console.error("Validating error");
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });
        }
    }
});
route.get("/getData", async (req, res) => {
    if(req.query.token){
        let curruser = encoder.decrypt(req.query.token);
        console.log('00000000');
        console.log(curruser);
        curruser = JSON.parse(curruser);
        curruser = curruser.user;
        console.log(curruser);
        console.log('00000000');
         try {
            let user = await Users.findOne({ mail: curruser.mail });
            if (!user) {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "invalid user"
                });
                return;
            }
            res.status(200).set({ 'Content-Type': 'application/json' }).send({
                "user": user
            });
        }
        catch (e) {
            console.error("Validating error");
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });
        }
    } 
        else if (!req.isAuthenticated()) {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({
            "msg": "you are not logged in"
        });
    }
    else if(req.isAuthenticated()){
        try {
            let user = await Users.findOne({ mail: req.user.user.mail });
            if (!user) {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "invalid user"
                });
                return;
            }
            res.status(200).set({ 'Content-Type': 'application/json' }).send({
                "user": user
            });
        }
        catch (e) {
            console.error("Validating error");
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });
        }
    }
    
});
route.post("/modify", cachefile.single('modpic'), validator.modvalidator, async (req, res) => {
    console.log(req.query);
     if(req.query.token){
        let curruser = encoder.decrypt(req.query.token);
         console.log(1111);
         console.log(curruser);
         curruser = JSON.parse(curruser);
         console.log(curruser);
         console.log(1111);
        let errs = validationResult(req);
        if (!errs.isEmpty()) {
            errs.array().forEach((err) => {
                console.log(err);
            })
            res.status(400).set({ 'Content-Type': 'application/json' }).send({
                errors: errs.array()
            });
            return;
        }
        try {
            let user = await Users.findOne({ mail: curruser.user.mail });
            console.log(user);
            if (!user) {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "invalid user"
                });
                return;
            }
            if (user.passwd != req.body.modpwd) {
                let hashpwd = await validator.genPwd(modpwd);
                req.body.modpwd = hashpwd;
            }
            fss.storeImage(user.ppic.split(process.env.SERVER+"/files/")[1], req.file.buffer);

            // Hash password here
            await Users.findOneAndUpdate(
                { _id: user._id },
                {
                    $set: {
                        name: req.body.modname,
                        passwd: req.body.modpwd,
                        phone: req.body.modphone,
                        uname: req.body.moduname
                    }
                });
            console.log(req.body);
            res.status(200).set({ 'Content-Type': 'application/json' }).send({
                "msg": "success"
            });

        }
        catch (e) {
            console.error("Validating error"); console.log(e.toString());
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });

        }
    } 
    else if (!req.isAuthenticated()) {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({
            "msg": "you are not logged in"
        });
    } else {
        console.log(req.body);
        let errs = validationResult(req);
        if (!errs.isEmpty()) {
            errs.array().forEach((err) => {
                console.log(err);
            })
            res.status(400).set({ 'Content-Type': 'application/json' }).send({
                errors: errs.array()
            });
            return;
        }
        try {
            let user = await Users.findOne({ mail: req.user.user.mail });
            if (!user) {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "invalid user"
                });
                return;
            }
            if (user.passwd != req.body.modpwd) {
                let hashpwd = await validator.genPwd(modpwd);
                req.body.modpwd = hashpwd;
            }
            fss.storeImage(user.ppic.split(process.env.SERVER+"/files/")[1], req.file.buffer);

            // Hash password here
            await Users.findOneAndUpdate(
                { _id: user._id },
                {
                    $set: {
                        name: req.body.modname,
                        passwd: req.body.modpwd,
                        phone: req.body.modphone,
                        uname: req.body.moduname
                    }
                });
            console.log(req.body);
            res.status(200).set({ 'Content-Type': 'application/json' }).send({
                "msg": "success"
            });

        }
        catch (e) {
            console.error("Validating error"); console.log(e.toString());
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });

        }
    }
});
route.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }), (req, res) => {
    res.status(200).send('sdf');
});
route.get('/google/callback', passport.authenticate('google', { failureRedirect: `http://${process.env.APP_URL}/?login=false` }), async (req, res, next) => {
    try {
        if (req.isAuthenticated) {
            let user = await Users.findOne({ uname: req.user.uname });
            if (!user) {
                next();
            } else {
                let tok = encoder.encrypt(JSON.stringify(req.session.passport.user));
                res.redirect(`http://${process.env.APP_URL}home?login=true&token=${tok}`);
            }
        }
    }
    catch (e) {
        res.redirect(`http://${process.env.APP_URL}`);
    }
}, async (req, res) => {
    if (req.isAuthenticated) {
        let dest = await fss.saveImage(req.user.upic, req.user.mail.replaceAll('.', '_'));
        await UserReqs.findOneAndUpdate({ mail: req.user.mail }, {
            $set: {
                name: req.user.uname,
                uname: '',
                passwd: '',
                phone: -1,
                ppic: `http://${process.env.SERVER}/files${dest}`,
                mail: req.user.mail,
                created: (new Date()),
                otp: ''
            }
        }, { upsert: true, setDefaultsOnInsert: true });
        let tok = encoder.encrypt(JSON.stringify({uname:req.user.uname,mail:req.user.mail,upic:`http://${process.env.SERVER}/files${dest}`}));
        res.redirect(`http://${process.env.APP_URL}?token=${tok}&signupgoogle=true`);
    }

})
route.get("/logout", (req, res) => {
    console.log('hey', Object.keys(req.user));
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) {
                console.error(err);
                res.status(400).set({ 'Content-Type': 'application/json' }).send({ ...req.user, msg: 'failure' });
            }
            else {
                res.status(200).redirect(`http://${process.env.APP_URL}`);
            }
        });
    }
    else {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({ ...req.user, msg: 'failure' });
    }
})
route.use("/loginlocal", validator.loginvalidator, async (req, res, next) => {
    if (req.isAuthenticated()) {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({
            "msg": "you are already logged in"
        });
    }
    else {
        let errs = validationResult(req);
        if (!errs.isEmpty()) {
            errs.array().forEach((err) => {
                console.log(err);
            })
            console.log(errs);
            return res.redirect(`http://${process.env.APP_URL}?login=false`)
        } else {
            next();
        }
    }
});
route.post("/loginlocal", passport.authenticate('local', { failureRedirect: `http://${process.env.APP_URL}?login=false` }), async (req, res)=>{
    let tok = encoder.encrypt(JSON.stringify(req.session.passport.user));
    res.redirect(`http://${process.env.APP_URL}home?login=true&token=${tok}`);
});
// {successRedirect:`http://${process.env.APP_URL}?login=true`,failureRedirect:`http://${process.env.APP_URL}?login=false`}));
route.post("/signuplocal", validator.validator, async (req, res) => {
    if (req.isAuthenticated()) {
        res.status(400).set({ 'Content-Type': 'application/json' }).send({
            "msg": "you are already logged in"
        });
    } else {
        try {
            let errs = validationResult(req);
            if (!errs.isEmpty()) {
                res.status(400).set({ 'Content-Type': 'application/json' }).send({
                    errors: errs.array()
                });
            }
            else {
                // Escape close
                let data = req.body;
                let user = await UserReqs.findOne({ mail: data.signmail });
                if (user && user.uname != '') {
                    res.status(400).set({ 'Content-Type': 'application/json' }).send({
                        status: "reload"
                    });
                    return;
                }
                let otp = "";
                for (var i = 0; i < 6; i++) {
                    otp += Math.floor(Math.random() * 10).toString()
                }
                let hashpwd = await validator.genPwd(data.signpwd), hashedOTP = await validator.genPwd(String(otp));
                await UserReqs.findOneAndUpdate({ mail: data.signmail }, {
                    $set: {
                        name: data.signfname + " " + data.signlname,
                        uname: data.signuname,
                        passwd: hashpwd,
                        phone: data.signphone,
                        mail: data.signmail,
                        created: (new Date()),
                        ppic:'https://sock8-b2a8f.web.app/logo%20lgbg.png',
                        otp: hashedOTP
                    }
                }, { upsert: true, setDefaultsOnInsert: true });
                mailer.sendMail({
                    from: 'shivang4110@rla.du.ac.in',
                    to: `${req.body.signmail}`,
                    subject: 'Sock8 - Verification Mail',
                    html: `<h1>Verify your account</h1>
                    <p style="background:#272727;color:white;font-family:bahnschrift;font-size:2rem;display:grid;place-content:center start;height:40vh;aspect-ratio:calc(1.96 / 1.08)">
                    You are trying to sign for an sock8 account is. Follow this link<br>
                    <a href="http://${process.env.APP_URL}?key=${hashedOTP}">Sign up ...</a>
                    </p>
                    `
                });
                res.status(200).set({ 'Content-Type': 'application/json' }).send({
                    "msg": "success",
                    "otp": otp
                });
            }
        }
        catch (e) {
            console.error("Validating error");
            res.status(500).set({ 'Content-Type': 'application/json' }).send({
                "msg": "Server error while validating",
                "spec": e.toString()
            });
        }
    }
});


// route.get("/googlePermissions", passport.authenticate("google", {
//     scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive']
// }))
// route.get("/googlePermissions", passport.authenticate("google", {
//     scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive']
// }))
// route.get("/google", passport.authenticate("google"), (req, res) => {
//     const { id } = req.user;
//     let newId = jwt.sign(id, process.env.SIGN)
//     console.log(id)
//     res.redirect(`http://localhost:3000?token=${newId}`)
// })
// route.get("/data/:id", (req, res) => {
//     const { id } = req.params;
//     console.log(id)
//     res.status(200).json(req.session.info);
// })
export default route;
