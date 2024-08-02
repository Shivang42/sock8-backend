import {writeFileSync,createWriteStream} from "fs";
import Axios from "axios";
import {resolve} from "path";

const __dirname = resolve();

const saveImage = async (url,dest)=>{
    let resp = await Axios({
        method:'GET',
        responseType:'stream'
        ,url
    });
    let destfinal = `/photos/${dest}.${resp.headers['content-type'].split('/')[1]}`;
    const writer = createWriteStream(`${__dirname}/userstorage${destfinal}`);
    
    resp.data.pipe(writer);
    return new Promise((resolve,reject)=>{
        writer.on('finish',resolve.bind(null,destfinal));
        writer.on('error',reject);
    })
}
const storeImage = (name,data)=>{
    writeFileSync(__dirname+"/userstorage/"+name,data);
}



export default {storeImage,saveImage};
