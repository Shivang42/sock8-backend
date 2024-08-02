import conn from "./dbmodel.js";
const tryone = async ()=>{
    let db = await conn;
}

if(conn.name){
    console.log(conn.name);
}else{
    try{
        let app = await tryone();
    }
    catch(e){
        console.log(`=========>${e.name}`);
    }
   
}
import express from "express"; 
const app = express();

let msg = {
    isConn:false,topologyViolated:true
};

// conn.client.on('close',(msg)=>{
//     Object.assign('isConn',true);
// });
// conn.client.on('top',(msg)=>{
//     Object.assign('topologyClosed',true);
// });
app.use(async (req,res,next)=>{
    let data = await conn.isConnected();
    console.log(data);
    res.send(msg);
});
app.listen(5000);