import passport from "passport";
import LocalStrategy from "passport-local"
import { compare } from "bcrypt";
import validator from "./validator.js";
import path from "path";
import {config} from "dotenv";

const __dirname = path.resolve();
import conn from "../dbmodel.js";

const localInit = (Users)=>{
    passport.serializeUser((user, done) => {
        return done(null, {user})
    });
    passport.deserializeUser((user, done) => {
        return done(null,user);
    });
    passport.use(new LocalStrategy({
        usernameField:'logname',
        passwordField:'logpwd'
    },
        async (username,password,done)=>{
            try{
                let hashed = await validator.genPwd(password);
                console.log('------->')
                console.log(username,hashed);
                let doc = await Users.findOne({uname:username});
                console.log(doc);
                let isValid = await compare(password,hashed);
                console.log(isValid);
                if(!doc || !isValid){
                    return done(null,false);
                }
                else{
                    return done(null,{uname:doc.uname,mail:doc.mail,upic:doc.ppic});
                }
            }
        catch(err){
            console.log(err);
            done(err);
        }
        }
    ))
}

export default localInit;