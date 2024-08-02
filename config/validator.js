import { body,check } from "express-validator";
import {genSalt,hash,compare} from "bcrypt";

const validator = [
    check('signfname','First Name is required').notEmpty(),
    check('signlname','Last Name is required').notEmpty(),
    check('signuname','Username is required').notEmpty(),
    check('signmail','Provide a valid email').notEmpty().isEmail(),
    check('signphone','Number is required').notEmpty(),
    check('signphone','Number should be 10 digits long').isNumeric().isLength({
        minLength:10,maxLength:10
    }),
    check('signpwd','Password is required').notEmpty(),
    check('signpwd','Password is not strong enough(at least 3 numbers required)').isStrongPassword({
        minLength:4,minNumbers:3,minUppercase:0,minSymbols:1
    }),
    body('signpwd2').custom((value,{req})=>{
        console.log(`${value==req.body.signpwd2}`)
        if(req.body.signpwd!=value){
            throw new Error('Both password must match')
        }
        else{
            return true;
        }
    })
];
const loginvalidator = [
    check('logname','First Name is required').notEmpty(),
    check('logpwd','Password is required').notEmpty()
];
const modvalidator = [
    check('modname','Name is required').notEmpty(),
    check('moduname','Username is required').notEmpty(),
    check('modphone','Number should be 10 digits long').isNumeric().isLength({
        minLength:10,maxLength:10
    }),
    check('modpwd','Password is not strong enough(at least 3 numbers required)').isStrongPassword({
        minLength:4,minNumbers:3,minUppercase:0,minSymbols:1
    })
];
const genPwd = async (raw)=>{
    let salt = await genSalt(8);
    let hashed = await hash(raw,salt);
    return hashed;
}
export default {genPwd,validator,loginvalidator,modvalidator};