import passport from "passport";
// import {Strategy as JwtStrategy,ExtractJwt} from "passport-jwt";
import GoogleStrategy from "passport-google-oauth2";
import conn from "../dbmodel.js";
import {config} from "dotenv";
import path from 'path';
const __dirname = path.resolve();
config({path:path.join(__dirname,'../server/.env')});

var opts = {
    clientID:process.env.googleclientID,
    clientSecret:process.env.googleclientSecret,
    callbackURL:process.env.googlecallbackURL
};

const jwtinit = (Users)=>{
    passport.serializeUser((user, done) => {
        return done(null, {user})
    });
    passport.deserializeUser((user, done) => {
        return done(null,user);
    })
    passport.use('google',new GoogleStrategy(opts,
        async function(accessToken,refreshToken,profile,done){
            try{
                let currUser = await Users.findOne({mail:profile.email});
                if(currUser){
                    done(null,{uname:currUser.uname,mail:currUser.mail,upic:currUser.ppic});
                }
                else{
                    done(null,{uname:profile.displayName,mail:profile.email,upic:profile.picture});
                }
            }
            catch(e){
                done(null,false);
            }
        }
    ));
    
}
export default jwtinit;
