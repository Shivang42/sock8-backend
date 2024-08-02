import {createClient} from "redis";
const redisClient = createClient({
    host:'localhost',
    port:6379
});
redisClient.on("error",(err)=>{
    if(err){console.error(err);}
    else{console.log("redis error ...")}
})
redisClient.on("connect",(err)=>{
    if(err){console.error(err);}
    else{console.log("redis connected ...")}
})
redisClient.connect().catch(console.error);

export default redisClient;